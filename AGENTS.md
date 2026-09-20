# MPK-Revival Project Guidelines

## Git & Version Control Operations
- **Strict Authorization Required**: NEVER run `git commit` or `git push` without explicit authorization from the user.
- Staging, drafting code, running local tests, and inspecting `git diff` / `git status` are permitted, but creating commits or pushing to remote remotes requires user approval.

## Hardware Safety Protocol
- **Non-Destructive First**: Prioritize read-only port discovery, SysEx dump capture, and offline byte analysis.
- **Zero Premature Write-Back**: Do not send experimental or unverified SysEx parameter writes to physical hardware without explicit verification and user confirmation.
