import "@babel/polyfill";
import * as d3 from 'd3';
import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import Choropleth from "./vis/choropleth";

// Define global variables
let map;

// Global data variables
let
	datahandler
;

const updateInfoBox = (id, d) => {
	let el = document.getElementById(id);

	let html = `<h3>${d.properties.statnaam}</h3><p>Stations in this (land) area:</p><ul>`;

	// Find stations in this province:
	let stations = datahandler.getStationsInRegion(d.properties.statcode);
	for (let station of stations) {
		html += `<li>${station.name} - ${station.station}</li>`;
	}

	html += "</ul>";
	el.innerHTML = html;
};

// Load data and start!
Promise.all([
	d3.json("./geoJSON/provincie_2017.json"),
	d3.json("./knmi/stations.json"),
]).then(function (files) {
	return start(files[0], files[1]);
}).catch(function (err) {
	throw err;
});

function start(mapdata, stationdata) {

	// Draw map and wait for the stations
	let stations = stationdata;
	map = new Choropleth("map_container", "#map", mapdata, stationdata);
	map.drawMap();
	map.addEventHandler("click", (d) => updateInfoBox("example", d));

	// Load all the stations files
	datahandler = new DataHandler(stations);

	// Promise.all([datahandler.load('350'), datahandler.load('370')]).then(() => {
	datahandler.loadAll().then(() => {

		let winter = {
			select: 'STN, DATE, TG as measurement',
			start: '1963-01-05',
			end: '1963-01-10'
		};

		let zomer = {
			select: 'STN, DATE, TG as measurement',
			start: '2017-07-01',
			end: '2017-07-31'
		};

		let lente = {
			select: 'STN, DATE, TG as measurement',
			start: '2014-03-21',
			end: '2014-06-31'
		};

		// Load choropleth
		datahandler.queryRange(
			lente
		).then((d) => {
			map.plotData(d);
		});

	});


}

