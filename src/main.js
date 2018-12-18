import "@babel/polyfill";
import * as d3 from 'd3';
import $ from "jquery";

import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import Choropleth from "./vis/choropleth";
import LoadingScreen from "./vis/loading";

import * as daterangepicker from "daterangepicker";
import "bootstrap/dist/js/bootstrap.bundle";

// Define global variables
let datahandler, map;

let season_queries = {
	"spring": "MONTH(DATE) BETWEEN 3 AND 5",
	"summer": "MONTH(DATE) BETWEEN 6 AND 8",
	"autumn": "MONTH(DATE) BETWEEN 9 AND 11",
	"winter": "MONTH(DATE) > 11 OR MONTH(DATE) < 3",
}

// Load data and start!
Promise.all([
	d3.json("./geoJSON/provincie_2017.json"),
	d3.json("./knmi/stations.json"),
]).then(function (files) {
	return start(files[0], files[1]);
}).catch(function (err) {
	throw err;
});

// Dirty dirty stuff here
$(document).ready(() => {

	const fixDropdownRadio = (e) => {
		$(e.currentTarget).dropdown('toggle');
		$(e.currentTarget).button('toggle');
	};

	const fixButtonFocus = (e) => {
		$(e.target).parents('.btn-group').find('label.dropdown-toggle > input:not(:checked)').parent('.active').removeClass('active')
		$('.dropdown-menu input:checked').parent().parent('li').toggleClass("active", true);
	};

	const dropdownRadioSelect = (e) => {
		let $target = $(e.currentTarget),
			$inp = $target.find('input');
		setTimeout(() => {
			let newprop = !$inp.prop("checked");
			$inp.prop("checked", newprop);
			$target.parent().toggleClass("active", newprop);
		}, 0);
		return false;
	};

	$("#geo_card .btn-group-toggle .btn.dropdown-toggle").off("click", fixDropdownRadio).on("click", fixDropdownRadio);
	$("#geo_card .btn-group .btn").off("click", fixButtonFocus).on("click", fixButtonFocus);
	$('#geo_card .dropdown-menu a').off('click', dropdownRadioSelect).on('click', dropdownRadioSelect);
});


function progressPromise(promises, tickCallback) {
	let len = promises.length, progress = 0;

	function tick(promise) {
		promise.then(() => {
			progress++;
			tickCallback(progress, len);
		});
		return promise;
	}

	return Promise.all(promises.map(tick));
}


function start(mapdata, stationdata) {

	// Draw map and wait for the stations
	let stations = stationdata;
	map = new Choropleth("map_container", "#map", mapdata, stationdata);
	map.drawMap();

	// Load all the stations files
	datahandler = new DataHandler(stations);

	let loadingInterval = LoadingScreen.start();

	progressPromise(datahandler.loadAll([350]), LoadingScreen.updateProgress).then(() => {

		LoadingScreen.stop(loadingInterval);

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

			let dp_settings = {
				minDate: min,
				maxDate: max,
				startDate: min,
				endDate: max,
				showDropdowns: true,
				alwaysShowCalendars: true,
				autoApply: true,
				autoUpdateInput: true,
				linkedCalendars: false,
				timeZone: 'utc'
			};

			// GEO MAP
			let geo_datepicker = $("#geomap_datepicker").daterangepicker($.extend({
				ranges: {
					"Winter '63": [new Date("1962-12-21"), new Date("1963-03-21")],
					"Juli 2018": [new Date("2018-07-01"), new Date("2018-07-31")]
				}
			}, dp_settings));

			// WIND ROSE
			let windrose_datepicker = $("#windrose_datepicker").daterangepicker($.extend({
				ranges: {
					"Winter '63": [new Date("1962-12-21"), new Date("1963-03-21")],
					"Juli 2018": [new Date("2018-07-01"), new Date("2018-07-31")]
				}
			}, dp_settings));

			// BAR CHART
			let minYear = min.getFullYear(), maxYear = max.getFullYear(), yearRange = Array.from({length: maxYear - minYear + 1}, (x, i) => maxYear - i);

			let date_selects = [document.getElementById("barchart_yearCompare"), document.getElementById("barchart_yearBegin"), document.getElementById("barchart_yearEnd")];

			for (let list of date_selects) {
				if ($(list).find('option').length === 0) {
					for (let year of yearRange) {
						list.add(new Option(year, year));
					}
				}
			}


			// RUN VIS

			// Button click handler
			$("#visualize").off("click").on("click", () => {

				// 1. Find out which visualization is selected
				let activeCard = $("#visSelection [aria-expanded='true']").parents(".card").attr('id');


				// 2. Validate selection (only for geo dropdowns)
				switch (activeCard) {
					case "geo_card":

						// TODO: If dropdown selected, check if any subfields selected

						break;
				}

				// 3. Remove old visualization


				// 4. Load new visualization
				switch (activeCard) {

					case "geo_card":

						// Get active dates
						let startDate = geo_datepicker.data('daterangepicker').startDate._i,
							endDate = geo_datepicker.data('daterangepicker').endDate._i;

						// Reset error classes
						$("#geo_card .invalid.btn-danger").addClass('btn-outline-secondary').removeClass('btn-danger');

						let q = "";

						// Check if season button is selected
						if ($("#geo_seasons").prop("checked") === true) {

							// Check if any seasons are selected
							let seasons_selected = $("#geo_season_dropdown input:checked");
							if (seasons_selected.length <= 0) {
								$("#geo_seasons").parent().addClass("invalid btn-danger").removeClass("btn-outline-secondary");
							}

							// Build season query
							if (seasons_selected.length < 4) {
								seasons_selected.each((i, el) => {
									if (i > 0) q += " or ";
									q += "(" + season_queries[el.id] + ")";
								});
							}

						}

						runVis(startDate, endDate, q);

						console.log(startDate, endDate)

						break;

					case "windrose_card":

						break;

					case "barchart_card":

						break;
				}

				//
				// console.log(startDate)
				// console.log(endDate)
				//
				// runVis(startDate, endDate, seasonQuery);

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

