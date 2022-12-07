# babylonjs-example

🖥️ Hyperbeam virtual computers in Babylon.js!

## How to run

Clone the repository and run the following commands in the root directory of the project.

```bash
npm install
npm run dev
```

## Using a custom embed URL

1. Get a free Hyperbeam API key from [here](https://hyperbeam.dev/).
2. Start a virtual computer on Hyperbeam by running the following command.

```bash
curl -X POST -H "Authorization: Bearer <your-api-key>" https://engine.hyperbeam.com/v0/vm
```

You should get a response similar to the following.

```json
{
  "session_id": "85a208c0-8fc1-4b27-bcbc-941f6208480b",
  "embed_url": "https://96xljbfypmn3ibra366yqapci.hyperbeam.com/haIIwI_BSye8vJQfYghICw?token=QAWRxLz6exTKbxlFG3MTBxsoPePyDa7_WO3FCxKO73M",
  "admin_token": "OjIulaS-YO4qWHoGap2iK3KqUvAX5qEi9_fDCxESNj0"
}
```

3. Copy the `embed_url` value and paste it in the `src/main.js` file in the `embedUrl` variable.
