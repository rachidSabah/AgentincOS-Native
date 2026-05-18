---
name: fullstack-engineer
description: Expert full-stack engineering skill covering Vue 3, Astro, Headless WordPress, and VPS/MariaDB optimization. Use when building modern web applications, integrating structured CMS data, or optimizing server environments and programmatic SEO.
---

# Full Stack Engineer

This skill provides operational rules and patterns for high-performance full-stack development.

## Core Technologies

### Frontend (Vue 3 & Astro)
- **Islands Architecture**: Use Astro (`.astro`) for static delivery and Vue 3 (Composition API) for client-side interactivity.
- **Optimization**: Prioritize `defineProps` for type-safety and use Vite for build-time asset optimization.

### Backend (Headless WordPress)
- **API Choice**: Use **WPGraphQL** for complex, nested data fetching. Use REST API for simple CRUD.
- **Structured Content**: Utilize ACF (Advanced Custom Fields) to break content into semantic units rather than using raw HTML blobs.

### Infrastructure & VPS
- **MariaDB**: Set `innodb_buffer_pool_size` to ~70% of RAM. Disable `query_cache`.
- **Background Processes**: Use `systemd` or `pm2` for process supervision. Implement Redis/Celery for task queuing.

## Programmatic SEO & Silos
- **Architecture**: Automate "Hub and Spoke" link structures.
- **Silo Rule**: Every spoke page must link to its hub and 3-5 sibling spokes.
- **Machine Readability**: Implement `llms.txt` and robust JSON-LD for AI-agent consumption.

## Operational Patterns
- **Idempotency**: Ensure deployment and generation scripts can run multiple times safely.
- **State Tracking**: Use `processing_status` columns in databases to track batch job progress.
- **Atomic Operations**: Only mark a task "complete" after all side effects (linking, indexing) are finished.
