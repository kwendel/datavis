import "@babel/polyfill";
import * as d3 from 'd3';
import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import Choropleth from "./vis/choropleth";
import Timeline from "./vis/timeline";

// Define global variables
let datahandler;

const initTimeline = (containerId, datahandler) => {

	// Select container with d3
	let container = d3.select(containerId);

	// Define interesting time periods
	let events = [
		{
			times: [{"starting_time": 1355752800000, "display": "circle"},
				{"starting_time": 1355767900000, "ending_time": 1355774400000}]
		},
	];

	// Get min/max times
	Promise.all([datahandler.query({
		select: "DATE",
		orderby: "DATE ASC",
		limit: 1
	}), datahandler.query({
		select: "DATE",
		orderby: "DATE DESC",
		limit: 1
	})]).then(values => {

		let min = values[0][0].DATE, max = values[1][0].DATE;

		console.log(new Date(min));
		console.log(new Date(max));

		// TODO: timeline brush/zoom selection

	});

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
	let map = new Choropleth("map_container", "#map", mapdata, stationdata);
	map.drawMap();
	map.addEventHandler("click", (d) => updateInfoBox("example", d));

	// Load all the stations files
	datahandler = new DataHandler(stations);

	datahandler.loadAll("350").then(() => {

		let buttonGroup = d3.select("#test");

		buttonGroup.selectAll("*").remove();

		buttonGroup
			.append("button")
			.classed("btn btn-primary", true)
			.text("Winter '63")
			.on("click", () => {

				datahandler.queryRange({
					select: 'STN, DATE, TG as measurement',
					start: '1963-01-05',
					end: '1963-01-10'
				}).then((d) => {
					map.setData(d);
					map.plot();
				});

			});

		buttonGroup
			.append("button")
			.classed("btn btn-primary", true)
			.text("Juli 2017")
			.on("click", () => {

				datahandler.queryRange({
					select: 'STN, DATE, TG as measurement',
					start: '2017-07-01',
					end: '2017-07-31'
				}).then((d) => {
					map.setData(d);
					map.plot();
				});

			});

		buttonGroup
			.append("button")
			.classed("btn btn-primary", true)
			.text("Lente 2014")
			.on("click", () => {

				datahandler.queryRange({
					select: 'STN, DATE, TG as measurement',
					start: '2014-03-20',
					end: '2014-06-21'
				}).then((d) => {
					map.setData(d);
					map.plot();
				});

			});

		buttonGroup
			.append("button")
			.classed("btn btn-primary", true)
			.text("Zomer 2018")
			.on("click", () => {

				datahandler.queryRange({
					select: 'STN, DATE, TG as measurement',
					start: '2018-06-21',
					end: '2018-09-23'
				}).then((d) => {
					map.setData(d);
					map.plot();
				});

			});

		let timeline = new Timeline("timeline_container", "#timeline");

	});


}

