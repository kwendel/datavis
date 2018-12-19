export const calculateSVGWH = (containerId) => {
	let container = document.getElementById(containerId);
	// Calculate inner element size
	let style = getComputedStyle(container);
	let elementWidth = container.clientWidth;
	let elementHeight = container.clientHeight;
	let viewWidth = elementWidth - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
	let viewHeight = elementHeight - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

	// If the element is hidden (display:none), height and width can be below zero
	if (viewWidth < 0 ) {
		viewWidth = 0;
	}
	if (viewHeight < 0 ) {
		viewHeight = 0;
	}

	return {viewWidth, viewHeight}
};

