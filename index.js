import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());

const scope = "user-read-currently-playing user-read-playback-state";
const redirectUri = encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI);
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const BASE_ACC_URL = "https://accounts.spotify.com/";
const SPOTIFY_API_URL = "https://api.spotify.com/v1/";

app.get("/login", (req, res) => {
  const url =
    `${BASE_ACC_URL}authorize?response_type=code` +
    `&client_id=${clientId}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${redirectUri}`;

  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch(`${BASE_ACC_URL}api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: decodeURIComponent(redirectUri),
    }),
  });

  const data = await tokenResponse.json();

  console.log("Access Token: ", data.access_token);
  console.log("Refresh Token: ", data.refresh_token);

  res.send("Tokens Obtained!");
});

const getAccessToken = async () => {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${BASE_ACC_URL}api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const data = await response.json();
  return data.access_token;
};

app.get("/now-playing", async (req, res) => {
  try {
    const access_token = await getAccessToken();

    const response = await fetch(
      `${SPOTIFY_API_URL}me/player/currently-playing`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (response.status === 204 || response.status > 400) {
      return res.status(200).send({
        isPlaying: false,
      });
    }

    const song = await response.json();

    console.log("song ", song);

    const item = song.item;

    res.json({
      isPlaying: song.is_playing,
      title: item.name,
      artist: item.artists.map((a) => a.name).join(", "),
      album: item.album.name,
      albumImageUrl: item.album.images[0]?.url,
      songUrl: item.external_urls.spotify,
      trackId: item.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch song details",
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log("## ## ## ## ## ##");
  console.log("Server is up and running on port ,", process.env.PORT);
  console.log("## ## ## ## ## ##");
});
