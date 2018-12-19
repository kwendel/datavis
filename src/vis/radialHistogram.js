import * as d3 from 'd3';
import {calculateSVGWH} from "../utils";
import * as chromatic from 'd3-scale-chromatic';

export default class RadialHistogram {
	constructor(containerId, svgId, stationData) {
		this.svg = d3.select(svgId);

		let {viewWidth, viewHeight} = calculateSVGWH(containerId);
		this.viewWidth = viewWidth;
		this.viewHeight = viewHeight;
		this.svg
			.attr('width', viewWidth)
			.attr('height', viewHeight);

		this.innerRadius = 20;
		// Substract 100px from outerRadius so that the legend also fits in the svg
		this.outerRadius = (Math.min(viewWidth, viewHeight) / 2) - 100;
		this.nrOfBands = 9; //up to 9 bands are supported

		// Wind speeds were in 0.1 m/s
		this.scaling = 0.1 * 3.6;

		this.initAxis();
		this.createMainGroup(viewWidth, viewHeight);


		this.station_area_map = new Map();
		this.stationdata = stationData.map(x => this.station_area_map.set(x.station, x.province_code));
	}

	initAxis() {
		this.angle = d3.scaleLinear()
			.range([0, 2 * Math.PI]);

		this.radius = d3.scaleLinear()
			.range([this.innerRadius, this.outerRadius]);

		this.x = d3.scaleBand()
			.range([0, 2 * Math.PI])
			.align(0);

		this.y = d3.scaleLinear() //you can try scaleRadial but it scales differently
			.range([this.innerRadius, this.outerRadius]);

		this.z = d3.scaleOrdinal()
			.range(chromatic.schemePurples[this.nrOfBands]);
		// .range(["#4242f4", "#42c5f4", "#42f4ce", "#42f456", "#adf442", "#f4e242", "#f4a142", "#f44242"]);
	}

	createMainGroup(width, height) {
		// create group or remove existing
		d3.selectAll("#mainGroup").remove();

		this.group = this.svg
			.append('g')
			.attr('id', 'mainGroup')
			// transform to middle of svg
			.attr('transform', `translate(${width / 2},${height / 2})`);
	}

	setDomain(data) {
		this.x.domain(this.directionRange);
		this.y.domain([0, d3.max(data, (d) => d.total)]);
		this.z.domain(this.speedRange);

		// Extend the domain slightly to match the range of [0, 2π].
		this.angle.domain([0, this.directionRange.length]);
		this.radius.domain([0, 0]).range([-this.innerRadius, -(this.outerRadius + 10)]);
	}

	setLegend(dataRange) {
		let legend = this.group.append("g")
			.selectAll("g")
			// we want high values above
			.data(dataRange.reverse())
			.enter().append("g")
			.attr("transform", (d, i) => {
				return "translate(" + (this.outerRadius + 0) + "," + (-this.outerRadius + 40 + (i - (dataRange.length) / 2) * 20) + ")";
			});

		legend.append("rect")
			.attr("width", 18)
			.attr("height", 18)
			.attr("fill", this.z);

		legend.append("text")
			.attr("x", 24)
			.attr("y", 9)
			.attr("dy", "0.35em")
			.attr('class', 'legend')
			.text(d => `${d} km/h`)
	}

	setLabels(data, angleOffset, angleKey) {
		let label = this.group.append("g")
			.selectAll("g")
			.data(data)
			.enter()
			.append("g")
			.attr("text-anchor", "middle")
			.attr("transform", (d) => {
				return "rotate(" + ((this.x(d[angleKey]) + this.x.bandwidth() / 2) * 180 / Math.PI - (90 - angleOffset)) + ")translate(" + (this.outerRadius + 30) + ",0)";
			});

		label.append("text")
			.attr("transform", (d) => {
				return (this.x(d[angleKey]) + this.x.bandwidth() / 2 + Math.PI / 2) % (2 * Math.PI) < Math.PI ? "rotate(90)translate(0,16)" : "rotate(-90)translate(0,-9)";
			})
			.text((d) => {
				return d[angleKey];
			})
			.style("font-size", 14);
	}

	setData(stackedData, angleOffset, angleKey) {
		const arc = d3.arc()
			.innerRadius((d) => this.y(d[0]))
			.outerRadius((d) => this.y(d[1]))
			.startAngle((d) => this.x(d.data[angleKey]))
			.endAngle((d) => this.x(d.data[angleKey]) + this.x.bandwidth())
			.padAngle(0.01)
			.padRadius(this.innerRadius);

		let paths = this.group
			.append("g")
			.selectAll("g")
			.data(stackedData)
			.enter()
			.append("g")
			.attr("fill", (d) => {
				return this.z(d.key);
			})
			.selectAll("path")
			.data((d) => d)
			.enter()
			.append("path")
			.attr("d", arc)
			.attr("transform", `rotate(${angleOffset})`)
			.style('opacity', 0);

		const t = d3.transition()
			.duration(500)
			.delay((d, i) => 500 *i)
			.ease(d3.easeCubic)

		paths
			.transition(t)
			.style('opacity', 1);
	}

	setAxisLines() {
		this.group.selectAll(".axis")
			.data(d3.range(this.angle.domain()[1]))
			.enter()
			.append("g")
			.attr("class", "axis")
			.attr("transform", (d) => {
				return "rotate(" + this.angle(d) * 180 / Math.PI + ")";
			})
			.call(d3.axisLeft().tickValues([])
				.scale(this.radius)
			);

		let yAxis = this.group.append("g")
			.attr("text-anchor", "middle");

		let yTick = yAxis
			.selectAll("g")
			.data(this.y.ticks(5).slice(1))
			.enter().append("g");

		yTick.append("circle")
			.attr("fill", "none")
			.attr("stroke", "gray")
			.attr("stroke-dasharray", "4,4")
			.attr("r", this.y);

		yTick.append("text")
			.attr("y", (d) => -this.y(d))
			.attr("dy", "-0.35em")
			.attr("x", -10)
			.text((d) => `${d}%`)
			.style("font-size", 14);
	}

	setTransformRanges(maxSpeed) {
		// DirectionRange
		this.directionRange = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

		// SpeedRange
		// We divide the speed range in nrOfBands parts
		// D3.ticks is not used because it returns unpredictable amount of steps
		let stepSize = (maxSpeed) / this.nrOfBands;
		// round to nearest integer that is dividable by 5
		stepSize = Math.ceil(stepSize / 5) * 5;

		this.speedRange = [];
		for (let i = 0; i < this.nrOfBands - 1; i++) {
			this.speedRange.push(`${i * stepSize} - ${(i + 1) * stepSize}`);
		}

		let lastSpeed = (this.nrOfBands - 1) * stepSize;

		// Stacker stacks the data based on the speed range blocks
		this.stacker = d3.stack()
			.keys(this.speedRange);

		return lastSpeed;
	}

	transformData(data, maxSpeed) {
		// Changes 0-360 degree vector to named direction
		let direction = d3.scaleQuantize()
			.domain([0, 360])
			.range(this.directionRange);

		// Change speed to discrete blocks
		// We need the last speed from the speed range to make a correct mapping
		let speed = d3.scaleQuantize()
			.domain([0, maxSpeed])
			.range(this.speedRange);

		// Change data
		for (let d of data) {
			d.range = speed(d.speed);
			d.angle = direction(d.angle);
		}

		return data;
	}

	computeFrequencies(data) {
		// Nest on angle, and per angle on range
		let nested = d3.nest()
			.key((d) => d.angle)
			.key((d) => d.range)
			.entries(data);

		let pv = d3.nest()
			.key(d => d.pv);

		// For every direction, we count the amount of windspeeds
		// Note: still should have been done with d3.histogram for better performance
		let totalCount = 0;
		for (let direction of nested) {
			let windSpeeds = direction.values;
			direction.total_count = 0;

			for (let w of windSpeeds) {
				// Provinces have multiple stations
				// Therefore, we take the average of every province
				let pvs = pv.entries(w.values);
				let counts = pvs.map(d => d.values.length);
				let avg_count = d3.mean(counts);
				// console.log(`${w.key} - ${counts} - ${avg_count}`);

				// Save the counts
				w.count = avg_count;
				totalCount += avg_count;
				direction.total_count += avg_count; //w.percentage;
			}
		}

		// Nested how contains the counts for every windspeed for every direction
		// We now turn it into a percentage by dividing by the total measurements that were maded
		for (let direction of nested) {
			direction.total = (direction.total_count / totalCount) * 100;
			let windSpeeds = direction.values;

			for (let w of windSpeeds) {
				w.percentage = (w.count / totalCount) * 100;
				direction[w.key] = w.percentage;
			}
		}


		return nested
	}

	removeUndefinedValues(data) {
		return data.filter((d) => {
			return d.angle !== undefined && d.speed !== undefined
		})
	}


	plotData(data) {
		// convert to km/h
		data = data.map(d => {
			return {
				...d,
				// convert speed
				speed: parseInt(d.speed) * this.scaling,
				// add province code
				pv: this.station_area_map.get(parseInt(d.STN)),

			};
		});

		let maxSpeed = d3.max(data, (d) => d.speed);

		this.createMainGroup(this.viewWidth, this.viewHeight);

		// Transform the data
		// - first, remove any undefined values
		// - transform direction and speed to discrete steps
		// - then compute the frequencies of the speed steps per direction
		data = this.removeUndefinedValues(data);

		let roundedMaxSpeed = this.setTransformRanges(maxSpeed);
		data = this.transformData(data, roundedMaxSpeed);
		data = this.computeFrequencies(data);

		// // Test if the total is 100%
		// let total_percentage = data.reduce((t, curr) => {
		// 	return t + curr.total;
		// }, 0);
		// console.log(`Total percentage ${total_percentage}`);

		// We may run into the problem that some direction doesn't have a direction
		// So add the an empty direction if it was not existing in the data
		let directions = data.map(d => d.key);
		for (let d of this.directionRange) {
			if (!directions.includes(d)) {
				data.push({
					key: d,
					values: [],
					total: 0,
					total_count: 0,
				});
			}
		}

		// Now draw the data
		let angleOffset = -360.0 / data.length / 2.0;
		this.setDomain(data);
		this.setLabels(data, angleOffset, 'key');
		this.setLegend(this.speedRange);

		// Stack the data so we can draw the stacked bars
		this.setData(this.stacker(data), angleOffset, 'key');
		this.setAxisLines();

	}
}