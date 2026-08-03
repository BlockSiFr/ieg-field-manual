# DASTOR Framework Mapping

*Gated practitioner reference · ATLAS · OWASP LLM Top 10 · NIST AI RMF*

Maps DASTOR execution-stack chapters to common AI security frameworks.

| Chapter | Frameworks | Execution layers | Vulnerability class |
|---|---|---|---|
| 1. AI Is Not Software | MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF | input, inference, planning, execution | prompt-injection-adjacent |
| 2. The AI Execution Stack Reference Model | NIST AI RMF | input, tokenization, context-assembly, inference, planning, tool-selection, execution, memory | architecture |
| 3. Prompt Injection | MITRE ATLAS, OWASP LLM Top 10 | input, context-assembly | prompt-injection |
| 4. Context Poisoning | MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF | context-assembly | retrieval-poisoning |
| 5. Reasoning Failures and Goal Hijacking | OWASP LLM Top 10, NIST AI RMF | planning, inference | goal-hijack |
| 6. Tool Exploitation | MITRE ATLAS, OWASP LLM Top 10 | tool-selection, execution | tool-abuse |
| 7. Execution Failures and Side Effects | NIST AI RMF | execution | side-effects |
| 8. Memory Is an Attack Surface | OWASP LLM Top 10 | memory, context-assembly | memory-poisoning |
| 9. Indirect Prompt Injection in the Wild | MITRE ATLAS, OWASP LLM Top 10 | input, context-assembly | prompt-injection |
| 10. Instruction Smuggling and Hidden Content | MITRE ATLAS | input, tokenization | smuggling |
| 11. Retrieval Poisoning and Embedding Weaknesses | MITRE ATLAS, OWASP LLM Top 10 | context-assembly | retrieval-poisoning |
| 12. Cross-Tenant Leakage in RAG and Memory | NIST AI RMF | context-assembly, memory | isolation |
| 13. Output Handling: When Text Becomes Code | OWASP LLM Top 10 | inference, execution | output-handling |
| 14. Unbounded Consumption: Cost and Availability Attacks | OWASP LLM Top 10 | inference, planning | unbounded-consumption |
| 15. The Planning Loop as an Attack Surface | NIST AI RMF | planning | planning |
| 16. Tool Chaining and Capability Gravity | OWASP LLM Top 10 | tool-selection, execution | tool-abuse |
| 17. Multi-Agent Handoffs and Delegation Abuse | NIST AI RMF | planning, execution | delegation |
| 18. Agent Graph Poisoning and Workflow Attacks | MITRE ATLAS | planning | workflow |
| 19. Human-in-the-Loop Failure Modes | NIST AI RMF | planning, execution | hitl |
| 20. Observability Failures: When You Can’t Reconstruct Why | NIST AI RMF | execution, memory | observability |
| 21. Sensitive Information Disclosure in Agentic Systems | OWASP LLM Top 10, NIST AI RMF | inference, execution | disclosure |
| 22. Privacy Attacks: Inversion, Membership, and Regurgitation | NIST AI RMF | inference, memory | privacy |
| 23. Data Residency, Retention, and Right to Forget | NIST AI RMF | memory | residency |
| 24. Auditability at Scale: Traces, Logs, and Evidence | NIST AI RMF | execution | evidence |
| 25. Compliance Mapping: SOC 2, ISO 27001, HIPAA, PCI DSS, EU AI Act | NIST AI RMF | execution, memory | compliance |
| 26. Incident Response for Agents: Containment and Rollback | NIST AI RMF | execution | incident-response |
| 27. Training and Fine-Tuning Poisoning | MITRE ATLAS, OWASP LLM Top 10 | inference | model-poisoning |
| 28. Backdoors, Trojan Triggers, and Model Integrity | MITRE ATLAS | inference | backdoor |
| 29. Model Theft and Behavioral Cloning | OWASP LLM Top 10 | inference | model-theft |
| 30. Tool Marketplace and Connector Supply Chain | MITRE ATLAS | tool-selection, execution | supply-chain |
| 31. Runtime Compromise: Sandboxes, Scripts, Container Escapes | MITRE ATLAS | execution | runtime |
| 32. CI/CD and Agent Builds in Production | NIST AI RMF | execution | cicd |
| 33. Deterministic Execution Gates | NIST AI RMF | execution, planning | gates |
| 34. Tool Security Engineering Patterns | OWASP LLM Top 10 | tool-selection, execution | tool-security |
| 35. Retrieval Security Engineering Patterns | MITRE ATLAS | context-assembly | retrieval-security |
| 36. Memory Security Engineering Patterns | NIST AI RMF | memory | memory-security |
| 37. Evaluation, Red Teaming, and Regression Harnesses | MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF | inference, execution | evaluation |
| 38. Governance Operating Model and Change Control | NIST AI RMF | planning, execution | governance |
| 39. The DASTOR Evidence Standard (ExecutionReceipt) | NIST AI RMF | execution | evidence |
| 40. Building AI Systems That Fail Safely | NIST AI RMF | execution, planning, memory | fail-safe |

---

Publisher: BlockSiFr LLC
Classification: Gated resource
