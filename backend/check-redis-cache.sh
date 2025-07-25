#!/bin/bash

# Check Redis cache for tour data

echo "Checking Redis for tour cache entries..."
echo "======================================="

# Connect to Redis and list all tour keys
redis-cli --scan --pattern "tours:*" | while read key; do
    echo -e "\nKey: $key"
    echo "Content preview:"
    redis-cli get "$key" | jq -r '.[0:2] | .[] | "\(.name // .displayName) - \(.showCount) shows"' 2>/dev/null || echo "Unable to parse JSON"
    
    ttl=$(redis-cli ttl "$key")
    if [ "$ttl" -gt 0 ]; then
        hours=$((ttl / 3600))
        minutes=$(((ttl % 3600) / 60))
        echo "Expires in: ${hours}h ${minutes}m"
    fi
done

echo -e "\n======================================="
echo "Total tour cache entries: $(redis-cli --scan --pattern "tours:*" | wc -l)"