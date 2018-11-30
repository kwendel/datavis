import * as d3 from 'd3';
import alasql from 'alasql';

// Define global variables
let vis = d3.select('#vis');
let
  viewWidth,
  viewHeight,
  projection
;

const resize = () => {
  let container = document.getElementById('viscontainer');
  viewWidth = container.clientWidth;
  viewHeight = container.clientHeight;
  
  vis = vis
    .attr('width', viewWidth)
    .attr('height', viewHeight);
};

const initMap = (config) => {
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
  d3.json(m.url).then((d) => {
    map.selectAll('path')
      .data(d[m.key])
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
        console.log(d[f.props][f.text]);
        console.log(d[f.props]);
      });
  });
};

const start = () => {
  resize();
  d3.select(window).on('resize', resize);
  
  let config = {
    map: {
      id: 'map',
      url: './provinces.json',
      key: 'features',
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
  initMap(config);
  
  d3.json('./209.json')
    .then((d) => {
      let q = alasql('SELECT * FROM ? WHERE DDVEC < 80', [d]);
      // select 2014 weather data
      let q2 = alasql('SELECT * FROM ? WHERE YYYYMMDD BETWEEN 20140101 AND 20141231', [d]);
      // select 2014 min, max and avg
      // DOESNT WORK ON 209.json BECAUSE THEY DIDNT MEASURE TEMPERATURE
      let q3 = alasql('SELECT MIN(TN) as min_temp, MAX(TX) as max_temp, AVG(TG) as avg_temp FROM ? WHERE YYYYMMDD BETWEEN 20140101 AND 20141231', [d]);
      console.log(q);
      console.log(q2);
      console.log(q3);
      
      
    })
    .catch((err) => {
      console.log(err);
      
    });
  
  
  // example of lat/long
  let cities = [
    {
      name: 'Amsterdam',
      lon: '4.899431',
      lat: '52.379189'
    },
    {
      name: 'Delft',
      lon: '4.3570677',
      lat: '52.0115769'
    }
  ];
  
  let points = vis.append('g');
  points
    .selectAll('circle')
    .data(cities)
    .enter()
    .append('circle')
    .attr('cx', (d) => projection([d.lon, d.lat])[0])
    .attr('cy', (d) => projection([d.lon, d.lat])[1])
    .attr('r', 3)
    .style('fill', 'red');
};

// document.addEventListener('DOMContentLoaded', () => start());
start();
