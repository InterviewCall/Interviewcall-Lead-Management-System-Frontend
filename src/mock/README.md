# Mock data

The API only has sign-in and staff endpoints so far. Screens for leads, pipeline, assignment, imports,
intake and reports read from `mock/*` through the functions in `features/*/api.ts`. Each of those
functions returns a Promise, so replacing one with a real `api.get(...)` call changes nothing in the UI.
Nothing in this folder is real data.
