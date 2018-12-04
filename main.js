import * as d3 from 'd3';

// Define global variables
let container = document.getElementById('map_container');
let map = d3.select('#map');
let
	viewWidth,
	viewHeight,
	projection,
	path;

let mapdata = require('./geoJSON/provincie_2017');
let stations = require("./knmi/stations");

const calculateWH = () => {

	// Calculate inner element size
	let style = getComputedStyle(container);
	let elementWidth = container.clientWidth;
	let elementHeight = container.clientHeight;
	viewWidth = elementWidth - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	viewHeight = elementHeight - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

}

const resize = () => {

	drawMap();

};

const drawMap = () => {

	calculateWH();

	// Mercator projection is worldmap on a square
	projection = d3.geoMercator().fitSize([viewWidth, viewHeight], mapdata);

	// Add projection to map
	// let path = d3.geoPath().projection(projection)

	// Fit projection to size
	projection = projection.fitSize([viewWidth, viewHeight], mapdata);
	path = d3.geoPath().projection(projection)

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

	d3.select(window).on('resize', drawMap);
};

const updateInfoBox = (id, d) => {
	let el = document.getElementById(id);

	let html = `<h3>${d.properties.statnaam}</h3><p>Stations in this (land) area:</p><ul>`;

	// Find stations in this province:
	for (let station of stations) {
		if (d3.geoContains(d.geometry, [station.lon, station.lat])) html += `<li>${station.name}</li>`;
	}

	html += "</ul>";
	el.innerHTML = html;
}

const start = () => {

	// load data, requires hardcoded string or parcel wont bundle it


	drawMap();

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
};

start();
