# OCI Infrastructure Setup — MCC Tracker

## Аккаунт
- **Tenancy:** ceovlad
- **Home Region:** Canada Southeast (Toronto)

---

## VCN

| Параметр | Значение |
|---|---|
| Name | `mcc-tracker-vcn` |
| Compartment | `ceovlad (root)` |
| IPv4 CIDR Block | `10.0.0.0/16` |
| DNS Label | `mcctracker` |
| DNS Domain Name | `mcctracker.oraclevcn.com` |
| OCID | `ocid1.vcn.oc1.ca-toronto-1.amaaaaaa4azbu3ia565360e7mw3gu3mf4yf4pgkq3cc6s4wiylniajgfraea` |
| Created | May 10, 2026, 17:25 UTC |

---

## Internet Gateway

| Параметр | Значение |
|---|---|
| Name | `mcc-tracker-igw` |
| Compartment | `ceovlad (root)` |

---

## Subnet (публичная)

| Параметр | Значение |
|---|---|
| Name | `mcc-tracker-subnet-public` |
| Type | Regional |
| IPv4 CIDR Block | `10.0.0.0/24` |
| Subnet access | Public |
| DNS Label | `public` |
| Route Table | `Default Route Table for mcc-tracker-vcn` |
| Security List | `Default Security List for mcc-tracker-vcn` |

---

## Route Table

| Параметр | Значение |
|---|---|
| Table | `Default Route Table for mcc-tracker-vcn` |
| Rule: Target type | `Internet Gateway` |
| Rule: Destination CIDR | `0.0.0.0/0` |
| Rule: Target | `mcc-tracker-igw` |

---

## Security List — открытые порты

| Порт | Протокол | Источник | Назначение |
|---|---|---|---|
| 22 | TCP | `0.0.0.0/0` | SSH |
| 80 | TCP | `0.0.0.0/0` | HTTP (React) |
| 443 | TCP | `0.0.0.0/0` | HTTPS |
| 3000 | TCP | `0.0.0.0/0` | Node.js API |

Добавить: OCI → VCN → Security Lists → Default → Add Ingress Rules

---

## Compute VM

| Параметр | Значение |
|---|---|
| Name | `cashback-mcc-server` |
| Compartment | `ceovlad (root)` |
| Image | Canonical Ubuntu 22.04 |
| Shape | VM.Standard.E2.1.Micro (Always Free AMD) |
| OCPU | 1 |
| RAM | 1 GB |
| VCN | `mcc-tracker-vcn` |
| Subnet | `mcc-tracker-subnet-public` |
| Public IPv4 | `147.5.126.225` |
| Domain | `checkback.duckdns.org` (DuckDNS, бесплатный) |
| HTTPS | Let's Encrypt (certbot) |
| SSH key | Скачан при создании (`.pem`) |

---

## Autonomous Database (ATP)

| Параметр | Значение |
|---|---|
| Display name | `mcc-tracker-db` |
| DB name | `MCCTRACKERDB` |
| Workload | Transaction Processing |
| Deployment | Serverless |
| Always Free | ✅ ON |
| DB version | 19c |
| DB User | `MCCTRACKER` |
| Wallet | Скачать: ATP → DB Connection → Download Instance Wallet |

---

## После создания VM — чеклист

- [ ] Подключиться по SSH: `ssh -i mcc-tracker.pem ubuntu@<PUBLIC_IP>`
- [ ] Открыть порты в Security List (80, 443, 3000)
- [ ] Установить Node.js 20, PM2, Nginx
- [ ] Скачать Oracle Wallet на VM
- [ ] Настроить Nginx (реверс-прокси)
- [ ] Задеплоить backend (PM2)
- [ ] Задеплоить frontend (React build)
