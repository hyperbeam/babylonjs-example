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

async function onWindowLoad() {
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
      if (!plane.material.diffuseTexture) {
        plane.material.diffuseTexture = BABYLON.RawTexture.CreateRGBTexture(
          null,
          frame.constructor === HTMLVideoElement
            ? frame.videoWidth
            : frame.width,
          frame.constructor === HTMLVideoElement
            ? frame.videoHeight
            : frame.height,
          scene,
          false,
          false // invertY is not working on chrome, so we need to vertically flip the texture manually.
        );
        // Flip the texture vertically.
        plane.material.diffuseTexture.vScale = -1;
        plane.material.diffuseTexture.vOffset = 1;
      }
      plane.material.diffuseTexture.update(frame);
    }

    function audioTrackCb(audioTrack) {
      const stream = new MediaStream([audioTrack]);
      const sound = new BABYLON.Sound("sound", stream, scene, null, {
        autoplay: true,
        spatialSound: true,
      });
      sound.attachToMesh(plane);
    }

    function resumeAudioContext() {
      if (BABYLON.Engine.audioEngine.audioContext.state === "suspended")
        BABYLON.Engine.audioEngine.audioContext.resume();
    }

    function sendPointerEvent(pointerInfo, hyperbeam) {
      const { type, event, pickInfo } = pointerInfo;
      if (!pickInfo.hit || pickInfo.pickedMesh !== plane) return;
      switch (type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
        case BABYLON.PointerEventTypes.POINTERMOVE:
        case BABYLON.PointerEventTypes.POINTERUP:
          {
            const textureCoordinates = pickInfo.getTextureCoordinates();
            if (!textureCoordinates) return;
            hyperbeam.sendEvent({
              type: {
                [BABYLON.PointerEventTypes.POINTERDOWN]: "mousedown",
                [BABYLON.PointerEventTypes.POINTERMOVE]: "mousemove",
                [BABYLON.PointerEventTypes.POINTERUP]: "mouseup",
              }[type],
              x: textureCoordinates.x,
              y: 1 - textureCoordinates.y,
              button: event.button,
            });
          }
          break;
        case BABYLON.PointerEventTypes.POINTERWHEEL:
          hyperbeam.sendEvent({
            type: "wheel",
            deltaX: event.deltaX,
            deltaY: event.deltaY,
          });
          break;
      }
    }

    function onPointerObservable(pointerInfo, hyperbeam) {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        resumeAudioContext();
      }
      sendPointerEvent(pointerInfo, hyperbeam);
    }

    let hyperbeamPromise;
    let hyperbeam;
    let pointerObservable;
    scene.registerBeforeRender(async () => {
      const distance = BABYLON.Vector3.Distance(
        camera.globalPosition,
        plane.position
      );
      if (distance < 25) {
        if (!hyperbeamPromise) {
          hyperbeamPromise = Hyperbeam(hyperbeamContainer, embedURL, {
            frameCb,
            audioTrackCb,
          });
          hyperbeam = await hyperbeamPromise;
          pointerObservable = scene.onPointerObservable.add((pointerInfo) =>
            onPointerObservable(pointerInfo, hyperbeam)
          );
        }
      } else {
        if (hyperbeamPromise) {
          hyperbeamPromise = null;
          hyperbeam.destroy();
          hyperbeam = null;
          scene.onPointerObservable.remove(pointerObservable);
          pointerObservable = null;
        }
      }
    });

    return scene;
  }

  const scene = await createScene();

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

window.addEventListener("load", onWindowLoad);
