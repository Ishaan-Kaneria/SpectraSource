// Fictional advisory used by the "Try a sample" button so a demo needs no prepared file.
export const SAMPLE_SOURCE = `Critical remote code execution vulnerability in Aranya SecureGate VPN 4.2 (CVE-2026-31337)

A critical vulnerability has been identified in the web management interface of Aranya SecureGate VPN appliances running firmware 4.0 to 4.2.3. An unauthenticated attacker on the network can send a crafted HTTP request to the /api/session endpoint and execute arbitrary commands with root privileges.

Active exploitation has been observed against government departments, power distribution companies and banks since 12 October 2026. Attackers are deploying a web shell, harvesting VPN credentials and moving laterally into internal networks. Around 4,800 internet-facing appliances in India remain unpatched.

Affected: SecureGate VPN firmware 4.0, 4.1 and 4.2 up to 4.2.3. Fixed in 4.2.4.

Organisations should upgrade to firmware 4.2.4 immediately, restrict the management interface to trusted IP addresses, reset all VPN user credentials, and review logs for requests to /api/session from unknown sources. Report incidents to your sectoral CSIRT within 6 hours of detection.`
