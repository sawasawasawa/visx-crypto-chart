import "./App.css";
import Chart from "./Chart";
import * as d3 from "d3";
import { useEffect, useState } from "react";
const parsePriceData = async (path: string) => {
  return (await d3.csv(path)).map((d) => ({
    close: parseInt(d?.close || "0", 10),
    date: d.time_open,
  }));
};

const price_BTC = "/assets/SBT_DataVisualization/price_BTC.csv";
const price_ETH = "/assets/SBT_DataVisualization/price_ETH.csv";
const buy_sell_volume_BTC =
  "/assets/SBT_DataVisualization/buy_sell_volume_BTC.csv";
const buy_sell_volume_ETH =
  "/assets/SBT_DataVisualization/buy_sell_volume_ETH.csv";
const on_chain_ETH_BTC = "/assets/SBT_DataVisualization/on_chain_ETH_BTC.csv";

const parseVolumeData = async (path: string) => {
  return await d3.csv(path);
};

const getData = async () => {
  const [btcPrices, ethPrices, btcVolumes, ethVolumes, onChainVolumes] =
    await Promise.all([
      parsePriceData(price_BTC),
      parsePriceData(price_ETH),
      parseVolumeData(buy_sell_volume_BTC),
      parseVolumeData(buy_sell_volume_ETH),
      parseVolumeData(on_chain_ETH_BTC),
    ]);

  return {
    btcPrices,
    ethPrices,
    btcVolumes,
    ethVolumes,
    onChainVolumes,
  };
};
function App() {
  const [data, setData] = useState(null);
  // @ts-ignore
  useEffect(async () => {
    const d = await getData();
    // @ts-ignore
    setData(d);
  }, []);

  return <div className="App">{data && <Chart {...data} />}</div>;
}

export default App;
