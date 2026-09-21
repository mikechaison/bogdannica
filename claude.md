# Encyclopedia Bogdannica Project

## Project Overview
An encyclopedia of local/community memes featuring:
- Article wiki-like browsing & editing
- User authentication (JWT or Django auth)
- File/Image uploads
- RAG-powered chatbot that explains lore in slang/jargon and invents side stories

## Tech Stack
- Frontend: React (Vite, TypeScript, Tailwind CSS)
- Backend: Python 3.11+, Django, Django REST Framework
- Vector Store: ChromaDB
- LLM Orchestration: LangChain (or LiteLLM)

## Development Workflow
- Backend directory: `/backend`
- Frontend directory: `/frontend`
- Always write type-safe code (TypeScript & Python type hints).
- Check backend with `pytest` / `python manage.py check` before finishing tasks.