export default async () => {
    try {
      const botToken = process.env.DISCORD_BOT_TOKEN
      const channelId = process.env.DISCORD_CHANGELOG_CHANNEL_ID
  
      if (!botToken || !channelId) {
        return new Response(
          JSON.stringify({ error: "Missing DISCORD_BOT_TOKEN or DISCORD_CHANGELOG_CHANNEL_ID" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }
  
      const url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=10`
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
          "User-Agent": "TibiaWebClient/ChangelogProxy"
        }
      })
  
      const body = await resp.text()
  
      return new Response(body, {
        status: resp.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }
  }
  