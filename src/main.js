import "@babel/polyfill";
import * as d3 from 'd3';
import DataHandler from './datahandler';
import RadialHistogram from './vis/radialHistogram'
import {calculateSVGWH} from "./utils";
import Histogram from "./vis/histogram";

// Define global variables
let map = d3.select('#map');
let
	projection,
	path
;
// Global data variables
let
	datahandler
;

const drawMap = (url) => {
	return d3.json(url).then((mapdata) => {
		let {viewWidth, viewHeight} = calculateSVGWH('map_container');
		map = map
			.attr('width', viewWidth)
			.attr('height', viewHeight);
		// Mercator projection is worldmap on a square
		projection = d3.geoMercator().fitSize([viewWidth, viewHeight], mapdata);

		// Fit projection to size
		projection = projection.fitSize([viewWidth, viewHeight], mapdata);
		path = d3.geoPath().projection(projection);

		// create group or use existing one
		d3.selectAll("#map *").remove();

		// features paths
		map.selectAll('path')
			.data(mapdata.features)
			.enter()
			.append('path')
			.attr('d', path)
			.attr('vector-effect', 'non-scaling-stroke') // keeps stroke-width the same if we transform
			.on('mouseover', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', true)
			})
			.on('mouseout', (d, i, nodes) => {
				d3.select(nodes[i]).classed('hover', false)
			})
			.on('click', (d) => updateInfoBox("example", d));

		return;
	}).catch((err) => {
		console.error(`Error during reading geoJSON with url: ${url}`);
		console.error(err)
	});
};

const drawStations = (url) => {
	return d3.json(url).then((stations) => {
		// Draw stations as svg circle
		let points = map.append('g');
		points
			.selectAll('circle')
			.data(stations)
			.enter()
			.append('circle')
			.attr('cx', (d) => projection([d.lon, d.lat])[0])
			.attr('cy', (d) => projection([d.lon, d.lat])[1])
			.attr('r', 3)
			.style('fill', 'red');

		// return stations for later reference
		return stations
	}).catch((err) => {
		console.error(`Error during reading the stations with url: ${url}`);
		console.error(err)
	});
};

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

async function resize() {
	// TODO: create seperate resize handler so we dont reload files
	// First draw the map and then the stations because we need the projection

	await drawMap("./geoJSON/provincie_2017.json");
	return await drawStations("./knmi/stations.json");
}

async function start() {
	// Set resize handler
	d3.select(window).on('resize', resize);

	// Draw map and wait for the stations
	let stations = await resize();
	// // Load all the stations files
	datahandler = new DataHandler(stations);
	// await Promise.all([datahandler.load('270'), datahandler.load('310')]);
	await datahandler.loadAll([270, 310, 260, 209, 210, 258, 267, 269 ]); //, '260']);

	// All is now loaded and we are ready to query and create visualizations

	// TODO: initialize visualizations
	// example
	// console.log('Query range 2014');
	// datahandler.queryRange({
	// 	select: 'STN, DATE as date, CAST(DDVEC as Number) as angle, CAST(FHVEC as Number) as speed, CAST(FG as Number) as avg_speed',
	// 	start: '1962-12-01',
	// 	end: '2014-03-01',
	// }).then((d) => {
	// 	let radial = new RadialHistogram('wind_container', '#wind');
	// 	radial.plotData(d)
	// });

	datahandler.queryRange({
		select: 'STN, DATE as date, CAST(SQ as Number) as duration, CAST(SP as Number) as percentage',
		start: '2010-12-01',
		end: '2014-03-01',
	}).then((d) => {
		let sun = new Histogram('hist_container', '#hist', stations);
		sun.plotData(d)
	});


}

start();
