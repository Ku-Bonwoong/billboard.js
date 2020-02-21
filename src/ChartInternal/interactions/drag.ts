/**
 * Copyright (c) 2017 ~ present NAVER Corp.
 * billboard.js project is licensed under the MIT license
 */
import {select as d3Select} from "d3-selection";
import CLASS from "../../config/classes";
import {getPathBox} from "../../module/util";
import {d3Selection} from "types/types";

export default {
	/**
	 * Called when dragging.
	 * Data points can be selected.
	 * @private
	 * @param {Object} mouse Object
	 */
	drag(mouse) {
		const $$ = this;
		const {config, state, $el: {main}} = $$;

		if ($$.hasArcType() ||
			!config.data_selection_enabled || // do nothing if not selectable
			(config.zoom_enabled && !$$.zoom.altDomain) || // skip if zoomable because of conflict drag behavior
			!config.data_selection_multiple // skip when single selection because drag is used for multiple selection
		) {
			return;
		}

		const [sx, sy] = state.dragStart;
		const [mx, my] = mouse;

		const minX = Math.min(sx, mx);
		const maxX = Math.max(sx, mx);
		const minY = config.data_selection_grouped ? state.margin.top : Math.min(sy, my);
		const maxY = config.data_selection_grouped ? state.height : Math.max(sy, my);

		main.select(`.${CLASS.dragarea}`)
			.attr("x", minX)
			.attr("y", minY)
			.attr("width", maxX - minX)
			.attr("height", maxY - minY);

		// TODO: binary search when multiple xs
		main.selectAll(`.${CLASS.shapes}`)
			.selectAll(`.${CLASS.shape}`)
			.filter(d => config.data_selection_isselectable.bind($$.api)(d))
			.each(function(d, i) {
				const shape: d3Selection = d3Select(this);
				const isSelected = shape.classed(CLASS.SELECTED);
				const isIncluded = shape.classed(CLASS.INCLUDED);
				let isWithin: any = false;
				let toggle;

				if (shape.classed(CLASS.circle)) {
					const x: number = +shape.attr("cx") * 1;
					const y: number = +shape.attr("cy") * 1;

					toggle = $$.togglePoint;
					isWithin = minX < x && x < maxX && minY < y && y < maxY;
				} else if (shape.classed(CLASS.bar)) {
					const {x, y, width, height} = getPathBox(this);

					toggle = $$.togglePath;
					isWithin = !(maxX < x || x + width < minX) && !(maxY < y || y + height < minY);
				} else {
					// line/area selection not supported yet
					return;
				}

				// @ts-ignore
				if (isWithin ^ isIncluded) {
					shape.classed(CLASS.INCLUDED, !isIncluded);
					// TODO: included/unincluded callback here
					shape.classed(CLASS.SELECTED, !isSelected);
					toggle.call($$, !isSelected, shape, d, i);
				}
			});
	},

	/**
	 * Called when the drag starts.
	 * Adds and Shows the drag area.
	 * @private
	 * @param {Object} mouse Object
	 */
	dragstart(mouse) {
		const $$ = this;
		const {config, state, $el: {main}} = $$;

		if ($$.hasArcType() || !config.data_selection_enabled) {
			return;
		}

		state.dragStart = mouse;

		main.select(`.${CLASS.chart}`)
			.append("rect")
			.attr("class", CLASS.dragarea)
			.style("opacity", "0.1");

		$$.setDragStatus(true);
	},

	/**
	 * Called when the drag finishes.
	 * Removes the drag area.
	 * @private
	 */
	dragend() {
		const $$ = this;
		const {config, $el: {main}} = $$;

		if ($$.hasArcType() || !config.data_selection_enabled) { // do nothing if not selectable
			return;
		}

		main.select(`.${CLASS.dragarea}`)
			.transition()
			.duration(100)
			.style("opacity", "0")
			.remove();

		main.selectAll(`.${CLASS.shape}`)
			.classed(CLASS.INCLUDED, false);

		$$.setDragStatus(false);
	},

	setDragStatus(isDragging) {
		this.dragging = isDragging;
	}
};
