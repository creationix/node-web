#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-


function wget_hello_world () {
  export LANG{,UAGE}=en_US.UTF_8
  local NODE_BIN="$(which node{js,} 2>/dev/null | head -n 1)"
  [ -n "$NODE_BIN" ] || NODE_BIN=node
  "$NODE_BIN" -e 'require("web/test-web")' &
  local NODE_PID=$!

  sleep 1   # wait for node init
  if ! kill -0 "$NODE_PID"; then
    wait "$NODE_PID"
    echo "E: node quit early, rv=$?"
    return 2
  fi

  local WGET_OPTS=(
    --output-document=/dev/stdout
    --timeout=5
    --tries=1
    --user-agent='test_wget'
    --no-proxy
    'http://localhost:8080/'
    )
  wget "${WGET_OPTS[@]}" | sed -ure 's!^!<wget> !;1s!^!\n!'

  kill -HUP "$NODE_PID"
  return 0
}










[ "$1" == --lib ] && return 0; wget_hello_world "$@"; exit $?
