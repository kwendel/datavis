import * as d3 from "d3";

/**
 * Continuous color scale legend.
 * Source: http://bl.ocks.org/syntagmatic/e8ccca52559796be775553b467593a9f
 */
export default class ContinousLegend {

	constructor(selector_id) {
		this.selector = selector_id;
	}

	legend(colorScale, colors, svg, delta = false) {

		const s = "choroplethLegend", legendheight = 250, legendwidth = 20;

		let colors_reverse = colors.slice().reverse();

		let legendDefs = d3.select("defs#legend");

		// Clear existing legend of this type
		legendDefs.selectAll(`#${s}`).remove();

		// Add linearGradient
		let gradient = legendDefs.append("linearGradient").attr("id", s)
			.attr('x1', '0%')
			.attr('y1', '0%')
			.attr('x2', '0%')
			.attr('y2', '100%');

		// Set the colors of the color scale
		gradient.selectAll('stop')
			.data(colors_reverse)
			.enter()
			.append('stop')
			.attr('offset', (d, i) => `${i * 1 / (colors.length - 1) * 100}%`)
			.attr('stop-color', (d) => d);

		svg.selectAll(".legend-container").remove();

		let svgLegend = svg.append("g").attr("class", "legend-container");

		let domain = colorScale.domain();
		let min = domain[0], max = domain[domain.length - 1];

		// Fix legend if min == max
		if (min == max) {
			min -= 0.01;
			max += 0.01;
		}

		let mean = (min + max) / 2;
		let steps = (max - min) / 5 - 1;

		let tickValues;

		if (delta) {
			tickValues = [min, mean, max];
		} else {
			tickValues = d3.range(min, max, steps);
			tickValues.push(max);
			tickValues = tickValues.reverse()
		}

		let legendScale = d3.scaleLinear()
			.domain([max, min]) // Add one extra tick in front and end
			.range([0, legendheight]);

		let legendaxis = d3.axisRight()
			.scale(legendScale)
			.tickSize(legendwidth)
			.tickPadding(6)
			.tickValues(tickValues)
			.tickFormat(t => Number(t).toFixed(1) + "°C")

		svgLegend.append("rect")
			.attr("height", legendheight + "px")
			.attr("width", legendwidth + "px")
			.style("fill", `url(#${s})`)
			.attr("transform", "translate(0,10)")

		svgLegend
			.append("g")
			.attr("class", "axis")
			.attr("transform", "translate(0,10)")
			.call(legendaxis);
	}

}
