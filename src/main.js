import "@babel/polyfill";
import * as d3 from 'd3';
import flatpickr from "flatpickr";
import $ from "jquery";

import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import Choropleth from "./vis/choropleth";
import LoadingScreen from "./vis/loading";

// Define global variables
let datahandler, map;

let loadingScreen = new LoadingScreen("#loading");

// Load data and start!
Promise.all([
	d3.json("./geoJSON/provincie_2017.json"),
	d3.json("./knmi/stations.json"),
]).then(function (files) {
	return start(files[0], files[1]);
}).catch(function (err) {
	throw err;
});


function progressPromise(promises, tickCallback) {
	var len = promises.length;
	var progress = 0;

	function tick(promise) {
		promise.then(function () {
			progress++;
			tickCallback(progress, len);
		});
		return promise;
	}

	console.log(promises)

	return Promise.all(promises.map(tick));
}


function start(mapdata, stationdata) {


	// Draw map and wait for the stations
	let stations = stationdata;
	map = new Choropleth("map_container", "#map", mapdata, stationdata);
	map.drawMap();

	// Load all the stations files
	datahandler = new DataHandler(stations);

	progressPromise(datahandler.loadAll(), (progress, len) => loadingScreen.updateProgress(progress, len)).then(() => {


		// Get min/max dates
		Promise.all([datahandler.query({
			select: "DATE",
			orderby: "DATE ASC",
			limit: 1
		}), datahandler.query({
			select: "DATE",
			orderby: "DATE DESC",
			limit: 1
		})]).then(values => {

			// Create JS date objects from extent
			let min = new Date(values[0][0].DATE), max = new Date(values[1][0].DATE);

			// Add datepickers
			let datepicker_min = flatpickr("#datepicker_min", {
				minDate: min,
				maxDate: max,
				defaultDate: min
			});

			let datepicker_max = flatpickr("#datepicker_max", {
				minDate: min,
				maxDate: max,
				defaultDate: max
			});

			// Button click handler
			$("#visualize").off("click").on("click", () => {

				// Get settings
				let startDate = datepicker_min.selectedDates[0],
					endDate = datepicker_max.selectedDates[0],
					seasonQuery = $("#season_selection input:checked").data("sql");

				runVis(startDate, endDate, seasonQuery);

			});


		});


	});


}

const runVis = (start, end, q) => {

	datahandler.queryRange({
		select: 'STN, DATE, TG as measurement',
		start: start,
		end: end,
		where: q
	}).then((d) => {
		map.setData(d);
		map.plot();
	});

};

