import Hyperbeam from "@hyperbeam/web";
import * as BABYLON from "babylonjs";

async function fetchEmbedUrl() {
  const embedURL = ""; // Are you running this locally and have an embed URL? Paste it here.
  if (embedURL) return embedURL;
  const room = location.pathname.substring(1);
  const response = await fetch(`https://demo-api.tutturu.workers.dev/${room}`);
  const json = await response.json();
  if (room !== json.room)
    history.replaceState(null, "", `${json.room}${location.search}`);
  return json.url;
}

window.addEventListener("DOMContentLoaded", async () => {
  const embedURL = await fetchEmbedUrl();
  const hyperbeamContainer = document.getElementById("hyperbeamContainer");

  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);

  async function createScene() {
    const scene = new BABYLON.Scene(engine);

    const camera = new BABYLON.UniversalCamera(
      "camera",
      new BABYLON.Vector3(0, 5, -10),
      scene
    );
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    const plane = BABYLON.MeshBuilder.CreatePlane(
      "plane",
      { width: 6, height: 3.375 },
      scene
    );
    plane.enablePointerMoveEvents = true;
    plane.material = new BABYLON.StandardMaterial("planeMaterial", scene);
    plane.material.emissiveColor = new BABYLON.Color3(1, 1, 1);

    function frameCb(frame) {
      const videoTexture = new BABYLON.VideoTexture(
        "videoTexture",
        frame,
        scene,
        false
      );
      plane.material.diffuseTexture = videoTexture;
    }

    function audioTrackCb(audioTrack) {
      const stream = new MediaStream([audioTrack]);
      const source =
        BABYLON.Engine.audioEngine.audioContext.createMediaStreamSource(stream);
      source.connect(BABYLON.Engine.audioEngine.audioContext.destination);
    }

    const hyperbeam = await Hyperbeam(hyperbeamContainer, embedURL, {
      frameCb,
      audioTrackCb,
    });

    function handlePointer(type, evt, pickInfo) {
      if (pickInfo.hit && pickInfo.pickedMesh === plane) {
        hyperbeam.sendEvent({
          type,
          x: pickInfo.getTextureCoordinates().x,
          y: 1 - pickInfo.getTextureCoordinates().y,
          button: evt.button,
        });
      }
    }

    function handlePointerDown(evt, pickInfo) {
      handlePointer("mousedown", evt, pickInfo);
      if (BABYLON.Engine.audioEngine.audioContext.state === "suspended")
        BABYLON.Engine.audioEngine.audioContext.resume();
    }

    function handlePointerMove(evt, pickInfo) {
      handlePointer("mousemove", evt, pickInfo);
    }

    function handlePointerUp(evt, pickInfo) {
      handlePointer("mouseup", evt, pickInfo);
    }

    scene.onPointerObservable.add((pointerInfo) => {
      const { type, event, pickInfo } = pointerInfo;
      switch (type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          handlePointerDown(event, pickInfo);
          break;
        case BABYLON.PointerEventTypes.POINTERMOVE:
          handlePointerMove(event, pickInfo);
          break;
        case BABYLON.PointerEventTypes.POINTERUP:
          handlePointerUp(event, pickInfo);
          break;
      }
    });

    function wheelHandler(evt) {
      hyperbeam.sendEvent({
        type: "wheel",
        deltaX: evt.deltaX,
        deltaY: evt.deltaY,
      });
    }

    plane.actionManager = new BABYLON.ActionManager(scene);

    plane.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger,
        (evt) => {
          canvas.addEventListener("wheel", wheelHandler);
        }
      )
    );

    plane.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOutTrigger,
        (evt) => {
          canvas.removeEventListener("wheel", wheelHandler);
        }
      )
    );

    return scene;
  }

  const scene = await createScene();

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
});
