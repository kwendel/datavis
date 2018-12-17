import * as d3 from 'd3';

/**
 * Display colors on map.
 */
export default class Timeline {

	constructor(containerid, svgid, data, min, max) {

		this.container = document.getElementById(containerid);
		this.timeline = d3.select(svgid);
		this.minDate = min;
		this.maxDate = max;

		this.currentSelection = false;

		this.dateFormatJS = d3.timeFormat("%Y-%m-%d");
		this.dateFormatShort = d3.timeFormat("%B %-d, %Y");

		this.settings = {
			timelineHeight: 50,
			axisHeight: 24,
			height: () => this.settings.timelineHeight + this.settings.axisHeight
		};

		this.calculateWH();

		this.timeline.attr("height", this.settings.height())

	}

	/**
	 * Draw timeline.
	 */
	draw() {

		let zoomed = () => {

			if (d3.event.sourceEvent == null || d3.event.sourceEvent.type == null || d3.event.sourceEvent.type === '') return;
			if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;

			let t = d3.event.transform;

			this.newX = t.rescaleX(x);


			// Rescale axis
			brushwrapper.call(this.brush, this.newX.range());
			brushwrapper.call(this.brush.move, this.newX.range());
			axiswrapper.call(axis.scale(this.newX));
			// Check selection boundaries

		};

		let trigger = () => {

			let selection = d3.event.selection || x.range(),
				dateLeft = new Date(this.dateFormatJS(x.invert(selection[0]))),
				dateRight = new Date(this.dateFormatJS(x.invert(selection[1])));

			this.currentSelection = [dateLeft, dateRight];

			console.log(selection)
			console.log(dateLeft)

			// Update timeline selection
			d3.select("#timeline_selection_pretty").text(this.dateFormatShort(dateLeft) + " - " + this.dateFormatShort(dateRight))
		}

		// Clear on redraw
		this.timeline.selectAll("*").remove();

		// Recalculate width/height
		this.calculateWH();

		// 1. Create time scale
		let x = d3.scaleTime()
			.range([0, this.settings.width])
			.domain([this.minDate, this.maxDate]);

		// 2. Create axis (with dates)
		let axis = d3.axisBottom(x);

		// 3. Create brush (timeline selection rectangle)
		this.brush = d3.brushX()
			.extent([[0, 0], [this.settings.width, this.settings.timelineHeight]])
			.on("brush end", trigger);

		let zoom = d3.zoom()
			.scaleExtent([1, Infinity])
			.translateExtent([[0, 0], [this.settings.width, this.settings.height()]])
			.extent([[0, 0], [this.settings.width, this.settings.height()]])
			// 	.scaleExtent([1, 4])
			.on("zoom", zoomed);

		// 3. Build SVG
		let context = this.timeline.append("g")
			.attr("class", "context");

		// 3.1 Add brush
		let brushwrapper = context.append("g")
			.attr("class", "brush")
			.call(this.brush)
			.call(this.brush.move, x.range())
			.call(zoom);

		// 3.2 Add axis
		let axiswrapper = context.append("g")
			.attr("class", "axis axis--x")
			.attr("transform", `translate(0,${this.settings.timelineHeight})`)
			.call(axis)
			.call(zoom);


	}

	getSelection() {
		return this.currentSelection;
	}

	/**
	 * Calculates width and height of map.
	 */
	calculateWH() {
		let style = getComputedStyle(this.container);
		this.settings.width = this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	}


}