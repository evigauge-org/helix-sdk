# Security Policy

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.**

Report it privately to **info@evigauge.com** with:

- a description of the issue and why you believe it is exploitable,
- the affected package and version,
- steps to reproduce, or a proof of concept,
- any suggested mitigation.

You can also use GitHub's private vulnerability reporting on this repository.

## What to expect

| Stage | Target |
|---|---|
| Acknowledgement of your report | 3 working days |
| Initial assessment | 10 working days |
| Fix or mitigation plan communicated | 30 days |

We will keep you informed as the work progresses, and we will credit you in the
advisory when the fix ships unless you ask us not to.

Please give us reasonable time to release a fix before disclosing publicly.

## Scope

In scope: the code in this repository — the TypeScript and Python client SDKs.

Out of scope: the Helix runtime and hosted services, which are covered by a
separate policy; vulnerabilities in third-party dependencies that are already
public, though we are glad to hear about them so we can bump the pin.

## Supported versions

While the SDKs are pre-1.0, only the latest published release of each package
receives security fixes.
