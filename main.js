import * as d3 from 'd3';

// Define global variables
let vis = d3.select('#vis');
let
  viewWidth,
  viewHeight,
  projection
;

let stations = require("./knmi/stations")


const resize = () => {
  let container = document.getElementById('viscontainer');
  viewWidth = container.clientWidth;
  viewHeight = container.clientHeight;
  //
  // vis = vis
  //   .attr('width', viewWidth)
  //   .attr('height', viewHeight);
};

const initMap = (features, config) => {
  const m = config.map;
  const f = config.features;

  // Mercator projection is worldmap on a square
  projection = d3.geoMercator()
    .scale(m.scale)
    .center(m.center)
    .translate(m.translate);

  let path = d3.geoPath()
    .projection(projection);

  // create group or use existing one
  let map = d3.select('#map');
  if (map.empty()) {
    map = vis
      .append('g')
      .attr('id', m.id);
  }

  // features paths
  map.selectAll('path')
    .data(features)
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
    .on('click', (d) => {
	  let el = document.getElementById("example");

	  let html = `<h3>${d.properties.statnaam}</h3><p>Stations in this (land) area:</p><ul>`;

	  // Find stations in this province:
	  for (let station of stations) {
	    if (d3.geoContains(d.geometry, [station.lon, station.lat])) html += `<li>${station.name}</li>`;
	  }

	  html += "</ul>";
	  el.innerHTML = html;
    });
};

const start = () => {
  resize();
  d3.select(window).on('resize', resize);

  // load data, requires hardcoded string or parcel wont bundle it
  let data = require('./geoJSON/provincie_2017');
  let features = data.features;

  let config = {
    map: {
      id: 'map',
      scale: 7000,
      center: [5.5, 52.2], // longitude, latitude of netherlands
      translate: [viewWidth / 2, viewHeight / 2], // center
    },
    features: {
      // specify the name of the keys that are used
      props: 'properties',
      text: 'areaName'
    }
  };

  initMap(features, config);

  let points = vis.append('g');
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
