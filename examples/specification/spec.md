---
title: Online booking service
kind: Functional specification
subtitle: Requirements for the first release of the booking service of a fictional fitness studio.
short: Booking service · Specification
client: Northwind Studio
author: Example Consulting
date: 2026-10-27
version: "0.9"
status: Draft for review
confidential: Internal
lang: en
paper: a4
theme: sobre
file: booking-specification-example
history:
  - { version: "0.9", date: 2026-10-27, author: Example Consulting, change: Draft for review }
---

# Summary

:::summary
Northwind Studio loses about **one booking in five** to phone tag. This specification defines a booking service that confirms a class in under a minute, keeps a waiting list, and charges at booking. **Release 1 holds 9 requirements, 6 of them Must.** The studio must approve the scope in chapter 3 before build starts.
:::

:::kpis
9 | requirements | 6 Must, 2 Should, 1 Could
< 1 min | to confirm a booking | today: up to 2 days
-20 % | missed bookings | target after 3 months
:::

# Context

:::goal
Place the service among the people and systems it talks to.
:::

The booking service sits between customers and the payment provider. It never stores card numbers.

![The booking service talks to customers on one side and to the payment provider on the other.](figures/context.svg)

Bookings peak on Saturdays, which sets the load the service must hold.

![Saturday carries twice the bookings of a weekday, and the target adds another 20 %.](figures/load.chart.json)

# Requirements

:::goal
List what release 1 must do, with how each requirement is accepted.
:::

![A booking is confirmed at once when a slot is free, otherwise the customer joins the waiting list.](figures/flow.mmd "width=90")

:::table{caption="Functional requirements of release 1" widths="13,37,12,38"}
| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| EXF-001 | A customer books a class from the timetable | {{bad:Must}} | Booking confirmed on screen and by email within 60 s |
| EXF-002 | A full class offers the waiting list | {{bad:Must}} | Customer added in one tap, position shown |
| EXF-003 | A freed slot goes to the first person waiting | {{bad:Must}} | Offer sent within 5 min of the cancellation |
| EXF-004 | Payment is taken at booking | {{bad:Must}} | No booking stored without a successful charge |
| EXF-005 | A customer cancels up to 12 h before | {{bad:Must}} | Refund issued automatically |
| EXF-006 | Reminder 24 h before the class | {{bad:Must}} | Sent to 100 % of confirmed bookings |
| EXF-007 | Staff see the day's attendance list | {{warn:Should}} | List printable on one page per class |
| EXF-008 | Customers rate a class afterwards | {{warn:Should}} | Rating stored, shown to staff only |
| EXF-009 | Gift a class to someone else | {{info:Could}} | Recipient receives a booking link |
:::

:::decision{title="Decision needed"}
Approve the six Must requirements as the scope of release 1. The two Should items move to release 2 if the budget is tight.
:::

:::signatures
Northwind Studio
Example Consulting
:::
