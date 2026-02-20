#!/bin/bash
# /usr/local/bin/fail2ban-country-ban.sh
# Usage: ./fail2ban-country-ban.sh <ip>
# 1. Identifies country of IP.
# 2. Checks if country is whitelisted (au/us).
# 3. If not, downloads country zone and adds to setup_deny ipset.

IP=$1
LOCKFILE="/tmp/country_ban.lock"

if [ -z "$IP" ]; then
    exit 1
fi

# Simple mutex to prevent race conditions during download
exec 200>$LOCKFILE
flock -n 200 || exit 1

# Identify Country
COUNTRY=$(geoiplookup "$IP" | grep -oE ": [A-Z]{2}," | cut -d' ' -f2 | tr -d ',')
COUNTRY=${COUNTRY,,} # to lowercase

if [ -z "$COUNTRY" ]; then
    echo "Could not identify country for $IP"
    exit 1
fi

# Whitelist Check (Safety)
if [[ "$COUNTRY" == "au" || "$COUNTRY" == "us" ]]; then
    echo "Country $COUNTRY is in Safety Whitelist. Ignoring."
    exit 0
fi

# Check if we already downloaded this country recently (simple cache)
CACHE_MARKER="/tmp/ban_marker_$COUNTRY"
if [ -f "$CACHE_MARKER" ]; then
    # We already processed this country recently.
    # The IPSet handles duplicates gracefully, but we can skip the download.
    echo "Country $COUNTRY already banned recently."
    exit 0
fi

echo "Banning entire country: $COUNTRY"

# Download and Add to IPSet
ZONE_FILE="/tmp/${COUNTRY}_ban.zone"
curl -sS "http://www.ipdeny.com/ipblocks/data/countries/$COUNTRY.zone" > "$ZONE_FILE"

# Add all ranges to setup_deny
# We use restore for speed (much faster than looping 'ipset add')
echo "create setup_deny hash:net maxelem 200000 timeout 86400" > /tmp/ipset_restore.txt
while read -r network; do
    echo "add -exist setup_deny $network timeout 86400" >> /tmp/ipset_restore.txt
done < "$ZONE_FILE"

sudo ipset restore < /tmp/ipset_restore.txt
rm "$ZONE_FILE" /tmp/ipset_restore.txt

# Create marker checks (valid for 23 hours to force refresh next day)
touch "$CACHE_MARKER"
# (Optional: logic to clean up old markers via cron, but /tmp clears on reboot usually)

echo "Banned $COUNTRY."
