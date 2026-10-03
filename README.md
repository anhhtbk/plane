<br /><br />

<p align="center">
<a href="https://plane.so">
  <img src="https://media.docs.plane.so/logo/plane_github_readme.png" alt="Plane Logo" width="400">
</a>
</p>
<p align="center"><b>Modern project management for all teams</b></p>

<p align="center">
    <a href="https://plane.so/"><b>Website</b></a> •
    <a href="https://forum.plane.so"><b>Forum</b></a> •
    <a href="https://x.com/planepowers"><b>X</b></a> •
    <a href="https://docs.plane.so/"><b>Documentation</b></a>
</p>

<p>
    <a href="https://app.plane.so/#gh-light-mode-only" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-top.webp"
        alt="Plane Screens"
        width="100%"
      />
    </a>
</p>

Meet [Plane](https://plane.so/), an open-source project management tool to track issues, run ~sprints~ cycles, and manage product roadmaps without the chaos of managing the tool itself. 🧘‍♀️

> Plane is evolving every day. Your suggestions, ideas, and reported bugs help us immensely. Do not hesitate to join in the conversation on [Forum](https://forum.plane.so) or raise a GitHub issue. We read everything and respond to most.

## 🚀 Installation

Getting started with Plane is simple. Choose the setup that works best for you:

- **Plane Cloud**
  Sign up for a free account on [Plane Cloud](https://app.plane.so)—it's the fastest way to get up and running without worrying about infrastructure.

- **Self-host Plane**
  Prefer full control over your data and infrastructure? Install and run Plane on your own servers. Follow our detailed [deployment guides](https://developers.plane.so/self-hosting/overview) to get started.

| Installation methods | Docs link                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker               | [![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://developers.plane.so/self-hosting/methods/docker-compose)         |
| Kubernetes           | [![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)](https://developers.plane.so/self-hosting/methods/kubernetes) |

`Instance admins` can configure instance settings with [God mode](https://developers.plane.so/self-hosting/govern/instance-admin).

## 🌟 Features

- **Work Items**
  Efficiently create and manage tasks with a robust rich text editor that supports file uploads. Enhance organization and tracking by adding sub-properties and referencing related issues.
  In a project's Work Items filter menu, choose **Title** to match a case-insensitive substring of the work item name (not its description or ID). Type a value and press Enter or leave the input to apply it; Escape discards an uncommitted edit. Surrounding whitespace is trimmed, and committing an empty value or using the chip's remove button removes the condition. Title combines with the existing filters using AND and is retained by project filter persistence and **Save view**.

- **Cycles**
  Maintain your team’s momentum with Cycles. Track progress effortlessly using burn-down charts and other insightful tools.

- **Modules**
  Simplify complex projects by dividing them into smaller, manageable modules.

- **Views**
  Customize your workflow by creating filters to display only the most relevant issues. Save and share these views with ease.

- **Pages**
  Capture and organize ideas using Plane Pages, complete with AI capabilities and a rich text editor. Format text, insert images, add hyperlinks, or convert your notes into actionable items.

- **Analytics**
  Access real-time insights across all your Plane data. Visualize trends, remove blockers, and keep your projects moving forward.

## 🛠️ Local development

See [CONTRIBUTING](./CONTRIBUTING.md)

Title-filter regression checks:

```sh
pnpm turbo run build --filter=@plane/shared-state...
pnpm --filter @plane/shared-state test
pnpm --filter web test
docker compose -f docker-compose-test.yml run --rm api-tests \
  pytest plane/tests/unit/utils/test_issue_title_filters.py \
  plane/tests/unit/utils/test_issue_datetime_filters.py -q
```

The rich-filter payload uses `{"name__icontains":"login"}` or that condition inside the existing `and` group. Project lists refetch from the API; no separate client-side title matcher or search endpoint is used.

## ⚙️ Built with

[![React Router](https://img.shields.io/badge/-React%20Router-CA4245?logo=react-router&style=for-the-badge&logoColor=white)](https://reactrouter.com/)
[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)](https://www.djangoproject.com/)
[![Node JS](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)](https://nodejs.org/en)

## 📸 Screenshots

  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-work-items.webp"
        alt="Plane Views"
        width="100%"
      />
    </a>
  </p>
  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-cycles.webp"
        width="100%"
      />
    </a>
  </p>
  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-modules.webp"
        alt="Plane Cycles and Modules"
        width="100%"
      />
    </a>
  </p>
  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-views.webp"
        alt="Plane Analytics"
        width="100%"
      />
    </a>
  </p>
   <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-analytics.webp"
        alt="Plane Pages"
        width="100%"
      />
    </a>
  </p>
</p>

## 📝 Documentation

Explore Plane's [product documentation](https://docs.plane.so/) and [developer documentation](https://developers.plane.so/) to learn about features, setup, and usage.

### Private registry image builds

[`Build Private Registry Images`](.github/workflows/build-private-registry-images.yml)
is a separate, manual-only workflow. It builds only these two application images
on an Ubuntu x64 runner for `linux/amd64`, from the same dispatched commit:

- `docker.pmr.vn/msc/plane/plane-frontend:sha-<full-commit-sha>` — root build
  context, `apps/web/Dockerfile.web`, with the Dockerfile's same-origin VITE defaults.
- `docker.pmr.vn/msc/plane/plane-backend:sha-<full-commit-sha>` — `apps/api` context,
  `apps/api/Dockerfile.api`.

A repository administrator must configure these **repository Actions secrets**
under **Settings → Secrets and variables → Actions**:

| Secret                      | Value                                                                 |
| --------------------------- | --------------------------------------------------------------------- |
| `PRIVATE_REGISTRY_USERNAME` | Registry account with access to `msc/plane`.                          |
| `PRIVATE_REGISTRY_TOKEN`    | Password/token with pull and push rights for both image repositories. |

These follow the existing username/token convention but are separate from
`DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`; never put credentials in source, workflow
inputs, or build arguments. The registry must be reachable over HTTPS with a
publicly trusted certificate from GitHub-hosted runners, and its administrator
must provision the namespace/repositories and private visibility as required.
The workflow cannot configure registry visibility or network access.

After an authorized push/merge, the workflow file must be present on the
repository's **default branch** for `workflow_dispatch` to be available. In
**Actions → Build Private Registry Images → Run workflow**, choose a trusted
branch containing this workflow and the intended source changes, then run it.
Both builds explicitly check out that run's `github.sha`, not a branch that can
move between builds. Do not dispatch untrusted branches: their workflow and
Dockerfiles execute with registry credentials. There are no PR/push triggers,
deployment steps, or GitHub write permissions in this workflow.

The run summary reports each build/push outcome, SHA tag, and successful
`repo@sha256:…` digest pin; the build job also exposes tags and digests as outputs.
A frontend failure skips the backend; a backend failure does not undo the
frontend push. Failed/cancelled pushes may have uploaded data, and abrupt runner
termination can prevent the summary. Publishing both images is not atomic.
Reruns reuse SHA tags and may replace them (or fail under an immutable-tag policy);
base images/dependencies can change even for the same source SHA. Pin deployments
by successful digest, not by assuming a SHA tag is immutable. No `latest` tag,
other application image, release, or deployment is published. Existing upstream
build/deployment workflows are unchanged and retain their own triggers.

Building these two images does not establish application health or compatibility
with a production Plane 1.4.2 stack. Actual Actions execution, registry
authentication, build/push, and deployment require separate operator action;
local workflow validation does not prove those outcomes.

## ❤️ Community

Join the Plane community on [GitHub Discussions](https://github.com/orgs/makeplane/discussions) and our [Forum](https://forum.plane.so). We follow a [Code of conduct](https://github.com/makeplane/plane/blob/master/CODE_OF_CONDUCT.md) in all our community channels.

Feel free to ask questions, report bugs, participate in discussions, share ideas, request features, or showcase your projects. We’d love to hear from you!

## 🛡️ Security

If you discover a security vulnerability in Plane, please report it responsibly instead of opening a public issue. We take all legitimate reports seriously and will investigate them promptly. See [Security policy](https://github.com/makeplane/plane/blob/master/SECURITY.md) for more info.

To disclose any security issues, please email us at security@plane.so.

## 🤝 Contributing

There are many ways you can contribute to Plane:

- Report [bugs](https://github.com/makeplane/plane/issues/new?assignees=srinivaspendem%2Cpushya22&labels=%F0%9F%90%9Bbug&projects=&template=--bug-report.yaml&title=%5Bbug%5D%3A+) or submit [feature requests](https://github.com/makeplane/plane/issues/new?assignees=srinivaspendem%2Cpushya22&labels=%E2%9C%A8feature&projects=&template=--feature-request.yaml&title=%5Bfeature%5D%3A+).
- Review the [documentation](https://docs.plane.so/) and submit [pull requests](https://github.com/makeplane/docs) to improve it—whether it's fixing typos or adding new content.
- Talk or write about Plane or any other ecosystem integration and [let us know](https://forum.plane.so)!
- Show your support by upvoting [popular feature requests](https://github.com/makeplane/plane/issues).

Please read [CONTRIBUTING.md](https://github.com/makeplane/plane/blob/master/CONTRIBUTING.md) for details on the process for submitting pull requests to us.

### Repo activity

![Plane Repo Activity](https://repobeats.axiom.co/api/embed/2523c6ed2f77c082b7908c33e2ab208981d76c39.svg "Repobeats analytics image")

### We couldn't have done this without you.

<a href="https://github.com/makeplane/plane/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=makeplane/plane" />
</a>

## License

This project is licensed under the [GNU Affero General Public License v3.0](https://github.com/makeplane/plane/blob/master/LICENSE.txt).
