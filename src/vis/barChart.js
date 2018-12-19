import * as d3 from 'd3';
import {calculateSVGWH} from "../utils";

export default class BarChart {
	constructor(containerId, svgId, stationData, yLabel) {
		this.svg = d3.select(svgId);

		let {viewWidth, viewHeight} = calculateSVGWH(containerId);
		this.viewWidth = viewWidth;
		this.viewHeight = viewHeight;

		this.svg
			.attr('width', viewWidth)
			.attr('height', viewHeight);

		this.viewWidth = viewWidth - 100;
		this.viewHeight = viewHeight - 100;
		this.ylabel = yLabel;
		// Time was in 0.1 hours
		this.scaler = 0.1;

		this.createMainGroup(viewWidth, viewHeight);


		this.station_area_map = new Map();
		this.stationdata = stationData.map(x => this.station_area_map.set(x.station, x.province_code));
		this.active_stations = new Set();

		this.initAxis();

	}

	initAxis() {
		let min = this.getDateFromMonth(0);
		let max = this.getDateFromMonth(12).setDate(0);
		this.x = d3.scaleTime()
			.range([0, this.viewWidth])
			.domain([min, max])
		;

		console.log(this.x.domain());
		this.y = d3.scaleLinear()
			.range([this.viewHeight, 0]);

		this.xAxis = d3.axisBottom(this.x)
			.tickFormat(d3.timeFormat("%B"))
		;
		this.yAxis = d3.axisLeft(this.y);
	}

	drawAxis() {
		// Set x-axis
		this.group
			.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", "translate(0," + this.viewHeight + ")")
			.call(this.xAxis)
			.selectAll('text,line')
			.style('text-anchor', 'middle')
			.attr('transform', 'translate(30,0)')
		;

		// Set x-axis label
		this.group
			.append('text')
			.attr('class', 'axis-label legend')
			.attr('transform', `translate(${this.viewWidth - 100},${this.viewHeight + 50})`)
			.text('Month');

		// Set y-axis
		this.group
			.append("g")
			.attr("class", "axis axis--y")
			// .attr("transform", "translate(0,0)")
			.call(this.yAxis);

		// Set y-axis label
		this.group
			.append('text')
			.attr('class', 'axis-label legend')
			.attr('transform', `translate(-35,150) rotate(-90)`)
			.text(this.ylabel)
	}

	getDateFromMonth(monthNumber) {
		return new Date(2018, parseInt(monthNumber), 1);
	}

	createMainGroup() {
		// create group or remove existing
		d3.selectAll("#mainGroup").remove();

		this.group = this.svg
			.append('g')
			.attr('id', 'mainGroup')
			.attr('transform', 'translate(50, 20)')
	}

	transformData(data) {
		// parser for the data
		const parseDate = d3.timeParse("%Y-%m-%d");
		const parse = (d) => {
			return {
				...d,
				duration: d.duration * this.scaler,
				date: parseDate(d.date),
				month: d3.timeMonth(parseDate(d.date)).getMonth(),
				pv: this.station_area_map.get(parseInt(d.STN)),
			}
		};

		// remove any undefined value
		const removeUndefined = (d) => {
			return d.duration !== undefined && d.percentage !== undefined
		};

		// do the actuale parsing and filtering
		data = data.filter(removeUndefined).map(parse);

		// Group the values per month
		let nested = d3.nest()
			.key(d => d.month)
			.entries(data);

		// Group values based on their province
		let provinceNester = (d) => d3.nest()
			.key(d => d.pv)
			.entries(d);

		// Now compute the average per province, and the average per month
		for (let month of nested) {
			let nested = provinceNester(month.values);

			let month_mean = [];
			for (let pv of nested) {
				let median = d3.mean(pv.values, d => d.duration);
				pv.median = median;
				month_mean.push(median);
			}

			month.values = nested;
			month.median = d3.mean(month_mean);
		}

		return nested;
	}

	drawBars(normal, compareWith) {
		// define handlers for x,y and height values
		const x = (d) => this.x(this.getDateFromMonth(d.key));
		const y = (d) => this.y(d.median);
		const h = (d) => this.y(0) - this.y(d.median);
		const visible = (d) => this.allowed.includes(parseInt(d.key)) ? 1 : 0.1;
		const t = d3.transition()
			.duration(1000);

		// define the bar plotter
		const plotter = (data, name, padding) => {
			let g = this.group
				.append('g')
				.attr('class', name)
				.attr('id', name)
				.attr('transform', `translate(${padding + 8},0)`)
			;

			let bars = g.selectAll(name)
				.data(data)
				.enter()
				.append('rect')
				.attr('id', d => `${name}-${d.key}`)
				.attr('width', 20)
				.attr('x', x)
				// y and height is initially zero to allow for transitions
				.attr('y', this.y(0))
				.attr('height', 0)
				.style('opacity', visible)
				.on("mouseover", (d, i, nodes) => {
					// Append text to top of bar
					g
						.append('text')
						.attr('class', 'bar-text')
						.attr('transform', `translate(${2},0)`)
						.attr('x', x(d))
						.attr('y', y(d) - 10)
						.text(d3.format('.1f')(d.median));
				})
				.on("mouseout", (d, i, nodes) => {
					g
						.selectAll('text')
						.remove();
				})
			;

			bars.transition(t)
				.attr('height', h)
				.attr('y', y)
		};

		plotter(normal, 'rect-normal', 25);
		plotter(compareWith, 'rect-compare', 0);
	}

	drawLegend() {
		const t = d3.transition()
			.duration(500);
		// .ease(d3.easeLinear);

		let legend = this.group
			.append('g')
			.attr('class', 'legend')
			.attr('transform', (d, i) => `translate(${this.viewWidth - 100},0)`)
			.selectAll('g')
			.data(['rect-normal', 'rect-compare'].reverse())
			.enter()
			.append('g')
			.on("mouseover", (d) => {
				// This probably can be done with CSS but I was unable to
				// TODO: Sven is this doable with CSS?
				if (d === 'rect-normal') {
					d3.selectAll('#rect-compare')
						.interrupt()
						.transition(t)
						.style('opacity', 0.2);
				}
				else if (d === 'rect-compare') {
					d3.selectAll('#rect-normal')
						.interrupt()
						.transition(t)
						.style('opacity', 0.2);
				}
			})
			.on("mouseout", (d) => {
				if (d === 'rect-normal') {
					d3.selectAll('#rect-compare')
						.interrupt()
						.transition(t)
						.style('opacity', 1);
				}
				else if (d === 'rect-compare') {
					d3.selectAll('#rect-normal')
						.interrupt()
						.transition(t)
						.style('opacity', 1);
				}
			});

		legend
			.append('rect')
			.attr('class', d => d)
			.attr('transform', (d, i) => `translate(0, ${i * 20})`)
			.attr('width', 18)
			.attr('height', 18);

		legend
			.append("text")
			.attr('transform', (d, i) => `translate(0, ${i * 20})`)
			.attr("x", 24)
			.attr("y", 9)
			.attr("dy", "0.35em")
			.text((d) => {
				if (d === 'rect-normal') {
					return 'Average'
				} else {
					return 'Selected'
				}
			})
	}

	setAllowedSeasons(seasonQuery) {
		let allowed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
		switch (seasonQuery) {
			case 'MONTH(DATE) IN (12, 1, 2)':
				allowed = [11, 0, 1];
				break;

			case 'MONTH(DATE) IN (3, 4, 5)':
				allowed = [2, 3, 4];
				break;

			case 'MONTH(DATE) IN (6, 7, 8)':
				allowed = [5, 6, 7];
				break;

			case'MONTH(DATE) IN (9, 10, 11)':
				allowed = [8, 9, 10];
				break;
		}

		this.allowed = allowed;

	}

	plotData(normal, compareWith, seasonQuery) {
		normal = this.transformData(normal);
		compareWith = this.transformData(compareWith);

		// set Y-axis, no need to set X-axis because we always loop over all the months
		let max = d3.max([d3.max(normal, d => d.median), d3.max(compareWith, d => d.median)]) * 1.1;
		this.y.domain([0, max]);

		this.setAllowedSeasons(seasonQuery);
		this.drawAxis();
		this.drawLegend();
		this.drawBars(normal, compareWith);
	}


}