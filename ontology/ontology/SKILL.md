---
name: ontology
description: Typed knowledge graph for structured agent memory. Use when you need to store, link, or query complex project entities like Tasks, Projects, People, and Documents with validated relationships.
---

# Ontology

A structured memory system for representing project knowledge as a verifiable graph.

## Core Concepts

- **Entity**: A typed object (e.g., Project, Task, Person) with properties.
- **Relation**: A link between two entities (e.g., Person `has_owner` Project).

## When to Use

- **Knowledge Retrieval**: "What do I know about X?", "Show all tasks for project Z".
- **Dependency Tracking**: "What depends on task X?", "Link document A to project B".
- **Structured Planning**: Modeling work as a series of related tasks and goals.

## Core Types

- **Person**: name, email, notes.
- **Project**: name, status, goals, owner.
- **Task**: title, status, due, priority, assignee, blockers.
- **Document**: title, path, url, summary.

## Runtime Instructions

1. **Storage**: Data is persisted in `memory/ontology/graph.jsonl` and `memory/ontology/schema.yaml`.
2. **Integrity**: Always validate new entities against the schema.
3. **Traversals**: Use graph relationships to find connected information that might not be obvious in a simple search.
