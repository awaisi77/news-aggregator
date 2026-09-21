#!/bin/sh
set -e
export NEWSAPI_KEY="${NEWSAPI_KEY:-}"
envsubst '$NEWSAPI_KEY' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
