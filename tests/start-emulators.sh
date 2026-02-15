#!/bin/bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@11
export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"
exec npx firebase emulators:start --only auth,firestore --project olymple --config tests/firebase.json
