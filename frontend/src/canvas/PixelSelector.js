import React, {useCallback, useEffect, useState} from 'react';
import './PixelSelector.css';
import canvasConfig from '../configs/canvas.config.json';
import backendConfig from '../configs/backend.config.json';

const PixelSelector = (props) => {
  const backendUrl = "http://" + backendConfig.host + ":" + backendConfig.port;
  const [placedTime, setPlacedTime] = useState(0);
  const [timeTillNextPlacement, setTimeTillNextPlacement] = useState("XX:XX"); // TODO: get from server on init
  // TODO: Animation for swapping selectorMode
  const [selectorMode, setSelectorMode] = useState(false);

  const timeBetweenPlacements = 5000; // 5 seconds TODO: make this a config
  const updateInterval = 200; // 200ms
  let staticColors = canvasConfig.colors;
  staticColors = staticColors.map(color => `#${color}FF`);

  const [colors, setColors] = useState([]);
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    if (isSetup) {
      return;
    }
    let getColorsEndpoint = backendUrl + "/get-colors";
    fetch(getColorsEndpoint, { mode: "cors" }).then((response) => {
      response.json().then((data) => {
        let colors = [];
        for (let i = 0; i < data.length; i++) {
          colors.push(data[i].hex);
        }
        colors = colors.map(color => `#${color}FF`);
        setColors(colors);
        setIsSetup(true);
      }).catch((error) => {
        setColors(staticColors);
        setIsSetup(true);
        console.error(error);
      });
    });
    // TODO: Return a cleanup function to close the websocket / ...
  }, [colors, backendUrl, staticColors, setColors, setIsSetup, isSetup]);

  // TODO: implement extraPixels feature(s)

  const getTimeTillNextPlacement = useCallback(() => {
    let timeSinceLastPlacement = Date.now() - placedTime;
    if (timeSinceLastPlacement > timeBetweenPlacements) {
      return 0;
    }
    return Math.floor((timeBetweenPlacements - timeSinceLastPlacement) / 1000);
  }, [placedTime]);

  const placePixelSelector = (event) => {
    event.preventDefault();
    // Only work if not clicking on the cancel button
    if (event.target.classList.contains("PixelSelector__cancel")) {
      return;
    }

    if (getTimeTillNextPlacement() === 0) {
      setSelectorMode(true);
    }
  }

  const selectColor = (color) => {
    props.setSelectedColorId(colors.indexOf(color));
    setSelectorMode(false);
  }

  const cancelSelector = () => {
    props.setSelectedColorId(-1);
    setSelectorMode(false);
  }

  // TODO: setPlacedTime(Date.now());

  useEffect(() => {
    const getPlacementText = () => {
      let timeTillNextPlacement = getTimeTillNextPlacement();
      if (timeTillNextPlacement === 0) {
        return "Place Pixel";
      }
      let minutes = Math.floor(timeTillNextPlacement / 60);
      let seconds = timeTillNextPlacement % 60;
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }

    const interval = setInterval(() => {
      setTimeTillNextPlacement(getPlacementText());
    }, updateInterval);
    return () => clearInterval(interval);
  }, [getTimeTillNextPlacement]);

  // TODO: getLastPlacedPixelTime
  useEffect(() => {
    const getLastPlacedPixel = backendUrl + "/getLastPlacedPixel?address=address1";
    fetch(getLastPlacedPixel, { mode: "cors" })
        .then((response) => response.json())
        .then((responseData) => {
          const time = new Date(responseData.time).toLocaleString('en-US', { timeZone: 'UTC' });
          setPlacedTime(time)
        })
        .catch((error) => {
            console.error("Error fetching data:", error);
        });
  }, []);

  return (
    <div className={"PixelSelector " + (props.getDeviceTypeInfo().isPortrait ? " PixelSelector--portrait" : "")}>
    {
      selectorMode &&
      <div className="PixelSelector__selector">
          {colors.map((color, idx) => {
            return (
              <div className="PixelSelector__color" key={idx} style={{backgroundColor: color}} onClick={() => selectColor(color)}></div>
            )
          })}
          <div className="PixelSelector__cancel" onClick={() => cancelSelector()}>x</div>
      </div>
    }
    { !selectorMode &&
      <div className={"PixelSelector__button " + (getTimeTillNextPlacement() === 0 ? "PixelSelector__button__valid" : "PixelSelector__button__invalid")} onClick={placePixelSelector}>
        <p>{timeTillNextPlacement}</p>
        { props.extraPixels > 0 &&
          <div style={{display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center"}}>
          <p style={{margin: "0 0.5rem"}}>|</p>
          <p>{props.extraPixels - props.extraPixelsUsed} XTRA</p>
          </div>
        }
        {props.selectedColorId !== -1 &&
          <div style={{display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", margin: "0 0 0 0.5rem"}}>
            <div className="PixelSelector__button__color" style={{backgroundColor: colors[props.selectedColorId]}}></div>
            <div className="PixelSelector__cancel" onClick={() => cancelSelector()}>x</div>
          </div>
        }
      </div>
    }
    </div>
  );
}

export default PixelSelector;
