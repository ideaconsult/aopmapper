## Introduction

This project uses modern frameworks and tooling to support scalable development, enhance collaboration, and maintain high code quality.

<!--
- [Astro](https://astro.build/): a JavaScript web framework, which aims to deliver a flexible approach to building sites with static site generation (SSG), server-side rendering (SSR), or a combination of both, keeping UI framework-agnostic with easy integration of components from React, Vue, Svelte, etc., all while delivering efficient code to the browser, resulting in improved performance.
- [Tailwind](https://tailwindcss.com/): a CSS framework that offers low-level utility classes instead of prebuilt components, aiming to provide greater flexibility while still enabling fast and consistent UI development without writing custom CSS.
- [Biome](https://biomejs.dev/): a toolchain for web development, which combines formatting and linting, similar to tools like Black and flake8 for Python.
-->
- [pnpm](https://pnpm.io/): a package manager for JavaScript projects, aiming to be a "performant npm", with improvements for efficiency, consistency, and security.
<!--
- [Lefthook](https://lefthook.dev/): Git hooks for automated code quality checks.
  - Git supports [hooks](https://git-scm.com/docs/githooks)—programs that can be run at specific points in the workflow, e.g., when `git commit` is used. The `pre-commit` hook is particularly useful for running programs like Biome automatically. This not only helps to keep the commit history cleaner, but, most importantly, saves time by catching trivial mistakes early.
-->

## Best practices

- **Do not commit to `main` directly**. Please use [feature branches](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow) and [pull requests](https://help.github.com/articles/about-pull-requests/). Only urgent fixes that are small enough may be directly merged to `main` without a pull request.

- **Rebase regularly**. If your feature branch has conflicts with `main`, you will be asked to rebase it before merging. Getting into the habit of [rebasing](https://git-scm.com/docs/git-rebase) your feature branches on a regular basis while still working on them will save you from the hassle of dealing with massive and probably hard-to-deal-with conflicts later.

- **Avoid merge commits when pulling**. If you made local commits on a branch, but there have also been new commits to it on GitHub, you will not be able to pull the branch cleanly (i.e., fast-forward it). By default, Git will try to incorporate the remote commits to your local branch with a merge commit. Do **not** do this. Either use `git pull --rebase` or run the following to change the default:

For the current repo only:
```sh
git config pull.rebase true
```

For all Git repos on this system:
```sh
git config --global pull.rebase true
```

## Tool requirements

The basic requirement is a working `pnpm` package manager.

### UNIX-like systems

Install `pnpm` through your package manager, e.g., on Arch Linux:
```sh
pacman -Syu pnpm
```

This will also pull Node.js if not already installed.

To enable [Node.js version management](#using-specific-nodejs-versions) via `pnpm env use`, run: 
```sh
pnpm setup
```

This will add the necessary environment setup to `.bashrc`. Support for shells other than Bash cannot be confirmed at the time of writing.

> [!IMPORTANT]
> If you're using ZFS, Btrfs, or another filesystem with integrated volume management—and your development workspace is on a separate dataset or subvolume—consider setting the `PNPM_HOME` environment variable to a directory located within that same dataset or subvolume, e.g., `${HOME}/dev/.pnpm`. If you've already run `pnpm setup`, you can simply update the environment configuration it added to your shell init file.

### Windows

> [!NOTE]
> Assuming you have 64-bit Windows, **PowerShell** means "Windows PowerShell", **not** "Windows PowerShell (x86)" or "Windows PowerShell ISE". If you can't find it in the Start menu, try searching for it. All modern Windows versions install PowerShell by default. You shouldn't need to install it separately.

> [!IMPORTANT]
> PowerShell should be run as a regular user, **not** "as administrator".

In **PowerShell** run:
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://get.pnpm.io/install.ps1 | iex"
```

As the installation script suggests, you need to open a **new** terminal to start using `pnpm`. Editors like Visual Studio Code will also need to be reloaded completely—merely reopening their built-in terminal(s) is **not** enough.

According to the `pnpm` developers, Windows Defender may block their executable when using the above method. If this happens, consult the [documentation](https://pnpm.io/installation) for alternatives.

Once `pnpm` is installed, you will need to pull Node.js as well. This is most conveniently achieved via the `pnpm env` command:

```sh
pnpm env use --global lts
```

> [!WARNING]
> If you have existing Node.js installation(s) that show up in Windows Settings -> Apps & Features, these **will** take precedence. `pnpm env` will appear to succeed, but the Node.js version will **not** be changed. Either uninstall these Node.js versions and manage Node.js via `pnpm env` **or** make sure to have a compatible Node.js version installed by other means: direct installation, nvm-windows, etc.

<!--
### Visual Studio Code

If you use Visual Studio Code for development, we strongly suggest that you install the following two official extensions:
* **[Astro](https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode)** – [documentation](https://docs.astro.build/en/editor-setup/)
* **[Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)** – [documentation](https://biomejs.dev/reference/vscode/)
-->

## Start developing

```sh
git clone git@github.com:ideaconsult/aopmapper.git
```
```sh
cd aopmapper
```
```sh
pnpm i
```
<!--
```sh
pnpm lefthook install
```
-->
```sh
pnpm dev
```
```sh
pnpm build
```

<!--
See also the [documentation](https://docs.astro.build/) on Astro.

## Running the formatters & linters

> **NOTICE:** Biome and other formatters and linters are run automatically against the changed files on `git commit`. Unlike pre-commit for Python, Lefthook is set up to automatically re-add any modified files, so there's no need to run `git add` manually. However, you may still need to run `git commit` again if files were changed.

Manually check for desired changes with Biome:
```sh
pnpm biome check
```

Manually check for desired changes **and** apply them at the same time:
```sh
pnpm biome check --write
```

Refer to the [documentation](https://biomejs.dev/guides/getting-started/#usage) for more information on how to use Biome.

## Running the tests

TBA
-->

## Using specific Node.js versions

Currently, `pnpm env use` allows only managing a global Node.js version:
```sh
pnpm env use --global nodejs-version
```

`nodejs-version` can be, e.g., `24`, `lts`, `nightly`, `16.0.0`.

Note that `pnpm` automatically downloads the required Node.js version.

List the downloaded Node.js versions:
```sh
pnpm env ls
```

Consult the [documentation](https://pnpm.io/cli/env) for more `pnpm env` subcommands.
