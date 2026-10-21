# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Regression test for authority-relative open-redirect via next_path.

Root cause: urlparse("///example.com/") returns both scheme and netloc
empty (a quirk of Python's URL parser for exactly-three-or-more leading
slashes), so validate_next_path's "extract only the path component" branch
(gated on scheme or netloc being truthy) never fires, and the original,
unmodified "///example.com/" string passes every remaining check unchanged.
Browsers still resolve a leading "//" as authority-relative against an
http(s) base, so the accepted value silently navigates off-domain.

Fixed by rejecting any next_path starting with "//" outright, after the
existing "must start with /" check.
"""

from urllib.parse import parse_qs, urlparse

import pytest

from plane.utils.path_validator import get_safe_redirect_url, validate_next_path

pytestmark = pytest.mark.unit


class TestValidateNextPathAuthorityRelative:
    @pytest.mark.parametrize(
        # Exactly three or more leading slashes: urlparse() returns both
        # scheme and netloc empty for these (the actual bug — verified
        # directly against Python's urlparse before writing this fix), so
        # the existing "extract only the path component" branch never fires
        # and the raw, still-dangerous string must be caught by the new
        # explicit "//" check instead.
        "malicious_next_path",
        [
            "///example.com/",
            "////example.com/",
            "/////example.com/",
        ],
    )
    def test_rejects_authority_relative_paths_urlparse_misses(self, malicious_next_path):
        assert validate_next_path(malicious_next_path) == "", (
            f"{malicious_next_path!r} must be rejected — a browser resolves a leading '//' "
            "as authority-relative and navigates off-domain regardless of what urlparse() made of it"
        )

    def test_exactly_two_slashes_was_already_safely_downgraded(self):
        """Positive control: urlparse() DOES detect a netloc for exactly two
        leading slashes, so the pre-existing branch already strips this down
        to a harmless same-origin path — this case never needed the new
        check and must keep working exactly as before."""
        assert validate_next_path("//example.com/") == "/"

    @pytest.mark.parametrize(
        "safe_next_path",
        [
            "/workspace/abc",
            "/",
            "/projects/123/issues",
        ],
    )
    def test_accepts_genuine_relative_paths(self, safe_next_path):
        assert validate_next_path(safe_next_path) == safe_next_path

    def test_still_downgrades_absolute_urls_with_a_scheme_to_a_safe_path(self):
        """Positive control: the pre-existing scheme/netloc branch already
        strips the host from a fully-qualified URL, leaving only a harmless
        same-origin path — this fix must not change that behavior."""
        assert validate_next_path("https://evil.com/phish") == "/phish"
        assert validate_next_path("http://evil.com/phish") == "/phish"

    @pytest.mark.parametrize(
        # A tab between each slash defeats both urlparse()'s own netloc
        # detection (verified directly: "/\t/\t/evil.com" -> scheme='',
        # netloc='') AND a literal next_path.startswith("//") check, since
        # the second character is a tab, not a slash. Per the WHATWG URL
        # spec, browsers strip every ASCII tab/CR/LF from a URL before
        # parsing it, so what the browser actually navigates on is
        # "///evil.com" — authority-relative, off-origin — even though this
        # function never sees a literal "//" prefix.
        "obfuscated_next_path",
        [
            "/\t/\t/evil.com",
            "/\r/\r/evil.com",
            "/\n/\n/evil.com",
        ],
    )
    def test_rejects_tab_cr_lf_obfuscated_authority_relative_paths(self, obfuscated_next_path):
        assert validate_next_path(obfuscated_next_path) == "", (
            f"{obfuscated_next_path!r} must be rejected — browsers strip tab/CR/LF before parsing, "
            "so this collapses to an authority-relative '///evil.com' navigation"
        )


# A block link is a page URL plus "#<block id>"; the fragment has to survive
# sign-in (next_path) without loosening any of the checks above.
BLOCK_FRAGMENT = "#6f1c2d4e-9a3b-4c5d-8e7f-0a1b2c3d4e5f"
PAGE_PATH = "/acme/projects/1f2e3d4c/pages/9a8b7c6d/"
APP_URL = "https://app.plane.test"


class TestValidateNextPathFragment:
    @pytest.mark.parametrize(
        "next_path",
        [
            PAGE_PATH + BLOCK_FRAGMENT,
            PAGE_PATH + "?view=full" + BLOCK_FRAGMENT,
            "/" + BLOCK_FRAGMENT,
        ],
    )
    def test_keeps_fragment_of_relative_path(self, next_path):
        assert validate_next_path(next_path) == next_path

    @pytest.mark.parametrize(
        "malicious_next_path",
        [
            # authority-relative
            "///evil.com/" + BLOCK_FRAGMENT,
            "////evil.com/" + BLOCK_FRAGMENT,
            # tab/CR/LF obfuscated authority-relative
            "/\t/\t/evil.com" + BLOCK_FRAGMENT,
            "/\r/\r/evil.com" + BLOCK_FRAGMENT,
            "/\n/\n/evil.com" + BLOCK_FRAGMENT,
            # backslashes collapse to a non-rooted path
            "\\\\evil.com" + BLOCK_FRAGMENT,
            # not rooted
            "evil.com/" + BLOCK_FRAGMENT,
            # path traversal, in the path or smuggled into the fragment
            "/acme/../../etc/passwd" + BLOCK_FRAGMENT,
            PAGE_PATH + "#../../evil",
            # suspicious patterns, in the path or in the fragment
            "/javascript:alert(1)" + BLOCK_FRAGMENT,
            PAGE_PATH + "#javascript:alert(1)",
            "/data:text/html,x" + BLOCK_FRAGMENT,
            "/%2e%2e/evil" + BLOCK_FRAGMENT,
            "/%2f%2fevil.com" + BLOCK_FRAGMENT,
            "/%5c%5cevil.com" + BLOCK_FRAGMENT,
            PAGE_PATH + "#<script>alert(1)</script>",
            PAGE_PATH + "#x onerror=alert(1)",
            # over the length limit
            "/" + "a" * 500 + BLOCK_FRAGMENT,
        ],
    )
    def test_still_rejects_attacks_with_fragment(self, malicious_next_path):
        assert validate_next_path(malicious_next_path) == ""

    @pytest.mark.parametrize(
        "absolute_next_path, expected",
        [
            ("https://evil.com/phish" + BLOCK_FRAGMENT, "/phish"),
            ("http://evil.com/phish" + BLOCK_FRAGMENT, "/phish"),
            ("//evil.com/phish" + BLOCK_FRAGMENT, "/phish"),
        ],
    )
    def test_still_strips_host_from_absolute_url_with_fragment(self, absolute_next_path, expected):
        assert validate_next_path(absolute_next_path) == expected


class TestGetSafeRedirectUrlEncodesNextPath:
    @pytest.fixture(autouse=True)
    def _allowed_hosts(self, settings):
        settings.WEB_URL = APP_URL
        settings.APP_BASE_URL = APP_URL
        settings.ADMIN_BASE_URL = None
        settings.SPACE_BASE_URL = None

    def test_fragment_stays_inside_next_path_value(self):
        url = get_safe_redirect_url(base_url=APP_URL, next_path=PAGE_PATH + BLOCK_FRAGMENT)

        parsed = urlparse(url)
        assert (parsed.scheme, parsed.netloc, parsed.path) == ("https", "app.plane.test", "/")
        assert parsed.fragment == ""
        assert parse_qs(parsed.query) == {"next_path": [PAGE_PATH + BLOCK_FRAGMENT]}

    def test_query_and_fragment_of_next_path_do_not_leak_into_redirect_params(self):
        next_path = PAGE_PATH + "?a=1&error_code=FORGED" + BLOCK_FRAGMENT

        url = get_safe_redirect_url(base_url=APP_URL, next_path=next_path, params={"error_code": "5100"})

        parsed = urlparse(url)
        assert parsed.fragment == ""
        assert parse_qs(parsed.query) == {"next_path": [next_path], "error_code": ["5100"]}

    def test_rejected_next_path_is_dropped(self):
        url = get_safe_redirect_url(
            base_url=APP_URL, next_path="///evil.com/" + BLOCK_FRAGMENT, params={"error_code": "5100"}
        )

        assert url == f"{APP_URL}/?error_code=5100"
