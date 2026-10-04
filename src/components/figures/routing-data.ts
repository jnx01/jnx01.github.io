/**
 * The real numbers behind the budgeted-model-routing chart.
 *
 * They live in this one file so that every drawing of the chart uses exactly
 * the same data (the full chart on /work/experiments and the small copy on
 * the homepage laptop screen). Source: the budgeted_model_routing repo
 * (README / REPORT). Change a number here and both charts change.
 *
 *   budget:   10%    25%    50%    75%
 *   random:  29.0   30.7   33.5   36.4
 *   router:  30.7   33.6   36.4   38.6
 */
export const budgets = [10, 25, 50, 75];
export const random = [29.0, 30.7, 33.5, 36.4];
export const router = [30.7, 33.6, 36.4, 38.6];
