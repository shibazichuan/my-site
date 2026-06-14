# 个人网站 - 阶段三·第四部分：积分付费系统 设计文档

> **日期**: 2026-06-14
> **状态**: 已确认
> **概述**: 积分充值/消费框架，第三方支付网关（PayJS），定价可配置

---

## 1. 范围

| 模块 | 内容 |
|------|------|
| 💰 积分系统 | 余额管理、充值/消费流水 |
| 💳 支付集成 | PayJS 支付网关（微信/支付宝扫码） |
| 🔧 消费中间件 | 通用积分扣减函数，供各功能模块调用 |
| 📊 管理配置 | 充值套餐可配、消费定价可配 |

### 不做

- 会员订阅/等级
- 退款流程（先搭框架，后续加）
- 自定义支付网关切换（先用 PayJS）

---

## 2. 架构

```
用户 ──扫码支付──▶ PayJS ──回调──▶ FastAPI /api/payment/notify
                                        │
                                 PostgreSQL (user_credits + credit_transactions + payment_orders)
```

---

## 3. 数据库

### 3.1 user_credits

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | UUID PK FK → users | |
| balance | INTEGER DEFAULT 0 | 当前积分 |

### 3.2 credit_transactions

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| amount | INTEGER | 正=充值，负=消费 |
| type | VARCHAR(20) | purchase / consume / refund |
| description | VARCHAR(200) | |
| payment_id | VARCHAR(100) nullable | 关联支付订单 |
| created_at | TIMESTAMP | |

### 3.3 payment_orders

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| amount_cents | INTEGER | 金额（分） |
| credits | INTEGER | 购买积分数 |
| status | VARCHAR(20) | pending / paid / expired |
| gateway | VARCHAR(20) | payjs |
| gateway_order_id | VARCHAR(100) nullable | 第三方订单号 |
| created_at | TIMESTAMP | |

---

## 4. API

### 4.1 积分 (需认证)

```
GET  /api/credits/plans              → [{ id, amount_cents, credits, name }]
POST /api/credits/order  { plan_id } → { order_id, qrcode_url, amount_cents }
GET  /api/credits/balance            → { balance }
GET  /api/credits/transactions       ?page=1 → { items[], total, page }
```

### 4.2 支付回调 (公开，验签)

```
POST /api/payment/notify  ← PayJS 回调
# 验签 → 改订单状态 → 加积分 → 记流水
```

### 4.3 消费函数 (内部调用)

```python
# services/credits_service.py
async def consume_credits(db, user_id, amount: int, description: str) -> bool:
    """扣减积分，返回是否成功"""
```

---

## 5. 前端

| 路由 | 组件 | 说明 |
|------|------|------|
| `/credits` | CreditsPage | 积分余额 + 充值套餐 + 流水列表 |
| `/credits/pay/:orderId` | PayPage | 二维码展示 + 支付状态轮询 |

### 修改

| 文件 | 改动 |
|------|------|
| `App.tsx` | 新增 `/credits/*` 路由 (AuthGuard) |
| `Navbar.tsx` | 新增 "💰 积分" 入口 |

---

## 6. 后端文件

```
backend/app/
├── models/credits.py           # UserCredits + CreditTransaction + PaymentOrder
├── schemas/credits.py          # 请求/响应
├── services/credits_service.py # 积分管理 + consume_credits
├── services/payment_service.py # PayJS 对接
├── api/credits.py              # 积分路由
├── api/payment.py              # 支付回调路由
```

### 修改

| 文件 | 改动 |
|------|------|
| `main.py` | 注册路由 |
| `config.py` | + PAYJS_MCHID, PAYJS_KEY, CREDITS_PER_YUAN |
| `models/__init__.py` | import credits models |
| `.env.example` | + PayJS 配置 |

---

## 7. 配置

```env
PAYJS_MCHID=your_mchid
PAYJS_KEY=your_key
CREDITS_PER_YUAN=10
```

---

## 8. 默认充值套餐

| 名称 | 金额 | 积分 |
|------|------|------|
| 入门包 | ¥10 | 100 |
| 标准包 | ¥50 | 500 |
| 进阶包 | ¥100 | 1,000 |

> 套餐存储在代码常量中，管理员可修改。
