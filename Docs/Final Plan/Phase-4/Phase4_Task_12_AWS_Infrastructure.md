# 📋 PHASE 4 - TASK 12: AWS INFRASTRUCTURE

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T12 |
| **Tên** | AWS Infrastructure |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | - |
| **Task tiếp theo** | Task 13 (CI/CD) |

---

## 📋 MỤC TIÊU

- AWS setup với Terraform/CDK
- RDS PostgreSQL
- ECS/Fargate hoặc Amplify
- S3 for file storage
- CloudFront CDN

---

## PHẦN 1: ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Internet                                                   │
│       │                                                      │
│       ▼                                                      │
│   CloudFront (CDN)                                          │
│       │                                                      │
│   ┌───┴───┐                                                  │
│   │       │                                                  │
│   ▼       ▼                                                  │
│  S3      ALB (Load Balancer)                                │
│ (Static)  │                                                  │
│           ▼                                                  │
│       ECS Fargate (Next.js)                                 │
│           │                                                  │
│           ▼                                                  │
│       RDS PostgreSQL                                         │
│                                                              │
│   Supporting Services:                                       │
│   - SES (Email)                                             │
│   - Secrets Manager                                          │
│   - CloudWatch (Logs)                                        │
│   - ECR (Docker Registry)                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## PHẦN 2: TERRAFORM

```hcl
# main.tf

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier           = "laba-erp-db"
  engine              = "postgres"
  engine_version      = "15"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  db_name             = "laba_erp"
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "laba-erp-cluster"
}

# S3 Bucket
resource "aws_s3_bucket" "uploads" {
  bucket = "laba-erp-uploads"
}
```

---

## ✅ CHECKLIST

- [ ] VPC setup
- [ ] RDS PostgreSQL
- [ ] ECS Fargate
- [ ] S3 + CloudFront
- [ ] Secrets Manager
- [ ] Domain + SSL

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 13 - CI/CD
