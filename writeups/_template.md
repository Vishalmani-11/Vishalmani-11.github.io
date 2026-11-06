---
title: [Title of the challenge/box]
date: YYYY-MM-DD
category: [Web / Pwn / Crypto / Reversing / Forensics / OSINT / Misc]
platform: [HTB / TryHackMe / VulnHub / CTF Name / etc.]
difficulty: 1
tags: [tag1, tag2, tag3]
summary: [One-line summary of what the challenge was about]
---

# [Title of the challenge/box]

## Summary

What the challenge was and the one-line path to the flag.

## Recon

What you saw, ports, files, services, and how you enumerated the target.

```bash
nmap -sV -p- 10.10.10.10
```

## Foothold

How you got initial access, with commands and explanations.

```bash
gobuster dir -u http://10.10.10.10 -w /usr/share/wordlists/dirb/common.txt
```

## Privilege Escalation

How you went from user to root/admin. Include commands and reasoning.

```bash
sudo -l
sudo /usr/bin/vi /etc/cron.d/backup
```

## Flags

- user: FLAG{redacted_user_flag_here}
- root: FLAG{redacted_root_flag_here}

## What I Learned

- Two or three concrete takeaways from this challenge
- What new technique or tool you discovered
- What mistake you made and how you fixed it

## Tools Used

- nmap
- gobuster
- burp suite
- linpeas
- bloodhound
