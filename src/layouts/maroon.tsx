import * as React from "react";
import { PlaceholderComponent, DefaultComponentNames } from "../api/registry/component";
import { Toolbar, IItem, DEFAULT_TOOLBAR_SIZE } from "../components/toolbar";
import * as Constants from "../constants";
import * as TemplateActions from "../actions/template";
import ToolbarContainer from "../containers/toolbar";
import ViewerApiShim from "../containers/viewer-shim";
import ModalLauncher from "../containers/modal-launcher";
import FlyoutRegionContainer from "../containers/flyout-region";
import { connect } from "react-redux";
import { tr, DEFAULT_LOCALE } from "../api/i18n";
import { RuntimeMap } from "../api/contracts/runtime-map";
import {
    NOOP,
    ReduxAction,
    ReduxDispatch,
    IApplicationState,
    IConfigurationReducerState,
    IViewerCapabilities,
    ITemplateReducerState,
    getRuntimeMap
} from "../api/common";
import { Accordion, IAccordionPanelSpec, IAccordionPanelContentDimensions } from "../components/accordion";
import { setCustomTemplateReducer, isElementState } from "../reducers/template";
import InitWarningDisplay from "../containers/init-warning-display";

function maroonTemplateReducer(state: ITemplateReducerState, action: ReduxAction): ITemplateReducerState {
    const data: boolean | TemplateActions.IElementState | undefined = action.payload;
    switch (action.type) {
        case Constants.FUSION_SET_LEGEND_VISIBILITY:
            {
                if (typeof(data) == "boolean") {
                    let state1: Partial<ITemplateReducerState>;
                    if (data === true) {
                        state1 = { legendVisible: true, taskPaneVisible: false, selectionPanelVisible: false };
                    } else {
                        state1 = { legendVisible: data };
                    }
                    return { ...state, ...state1 };
                }
            }
        case Constants.FUSION_SET_SELECTION_PANEL_VISIBILITY:
            {
                if (typeof(data) == "boolean") {
                    let state1: Partial<ITemplateReducerState>;
                    if (data === true) {
                        state1 = { legendVisible: false, taskPaneVisible: false, selectionPanelVisible: true };
                    } else {
                        state1 = { selectionPanelVisible: data };
                    }
                    return { ...state, ...state1 };
                }
            }
        case Constants.TASK_INVOKE_URL:
            {
                let state1: ITemplateReducerState = { taskPaneVisible: true, selectionPanelVisible: false, legendVisible: false };
                return { ...state, ...state1 };
            }
        case Constants.FUSION_SET_TASK_PANE_VISIBILITY:
            {
                if (typeof(data) == "boolean") {
                    let state1: Partial<ITemplateReducerState>;
                    if (data === true) {
                        state1 = { legendVisible: false, taskPaneVisible: true, selectionPanelVisible: false };
                    } else {
                        state1 = { taskPaneVisible: data };
                    }
                    return { ...state, ...state1 };
                }
            }
        case Constants.FUSION_SET_ELEMENT_STATE:
            {
                if (isElementState(data)) {
                    return { ...state, ...data };
                }
            }
    }
    return state;
}

export interface IMaroonTemplateLayoutState {
    map: RuntimeMap;
    config: IConfigurationReducerState;
    capabilities: IViewerCapabilities;
    showLegend: boolean;
    showTaskPane: boolean;
    showSelection: boolean;
}

export interface IMaroonTemplateLayoutDispatch {
    setElementStates: (states: TemplateActions.IElementState) => void;
}

function mapStateToProps(state: Readonly<IApplicationState>): Partial<IMaroonTemplateLayoutState> {
    return {
        config: state.config,
        map: getRuntimeMap(state),
        capabilities: state.config.capabilities,
        showLegend: state.template.legendVisible,
        showTaskPane: state.template.taskPaneVisible,
        showSelection: state.template.selectionPanelVisible
    };
}

function mapDispatchToProps(dispatch: ReduxDispatch): Partial<IMaroonTemplateLayoutDispatch> {
    return {
        setElementStates: (states: TemplateActions.IElementState) => dispatch(TemplateActions.setElementStates(states))
    };
}

export type MaroonLayoutTemplateProps = Partial<IMaroonTemplateLayoutState> & Partial<IMaroonTemplateLayoutDispatch>;

const SIDEBAR_WIDTH = 250;
const TOP_BAR_HEIGHT = 35;
const STATUS_BAR_HEIGHT = 18;
const SIDEBAR_PADDING = 0;
const OUTER_PADDING = 3;

export class MaroonTemplateLayout extends React.Component<MaroonLayoutTemplateProps, any> {
    private fnActivePanelChanged: (id: string) => void;
    constructor(props: MaroonLayoutTemplateProps) {
        super(props);
        this.fnActivePanelChanged = this.onActivePanelChanged.bind(this);
    }
    private onActivePanelChanged(id: string): void {
        const { setElementStates } = this.props;
        if (setElementStates) {
            const states: TemplateActions.IElementState = {
                legendVisible: false,
                taskPaneVisible: false,
                selectionPanelVisible: false
            };
            switch (id) {
                case "Legend":
                    states.legendVisible = true;
                    break;
                case "TaskPane":
                    states.taskPaneVisible = true;
                    break;
                case "Selection":
                    states.selectionPanelVisible = true;
                    break;
            }
            //One of these must be true
            if (states.legendVisible || states.taskPaneVisible || states.selectionPanelVisible)
                setElementStates(states);
        }
    }
    private getLocale(): string {
        return this.props.config ? this.props.config.locale : DEFAULT_LOCALE;
    }
    componentDidMount() {
        setCustomTemplateReducer(maroonTemplateReducer);
    }
    render(): JSX.Element {
        const { config, map, capabilities } = this.props;
        let hasTaskPane = false;
        let hasTaskBar = false;
        let hasStatusBar = false;
        let hasNavigator = false;
        let hasSelectionPanel = false;
        let hasLegend = false;
        if (capabilities) {
            hasTaskPane = capabilities.hasTaskPane;
            hasTaskBar = capabilities.hasTaskBar;
            hasStatusBar = capabilities.hasStatusBar;
            hasNavigator = capabilities.hasNavigator;
            hasSelectionPanel = capabilities.hasSelectionPanel;
            hasLegend = capabilities.hasLegend;
        }
        const locale = this.getLocale();
        const bottomOffset = hasStatusBar ? STATUS_BAR_HEIGHT : 0;
        const topOffset = (DEFAULT_TOOLBAR_SIZE * 2) + OUTER_PADDING;
        const panels: IAccordionPanelSpec[] = [
            {
                id: "Legend",
                title: tr("TPL_TITLE_LEGEND", locale),
                contentRenderer: (dim: IAccordionPanelContentDimensions) => {
                    return <div style={{ width: dim.width, height: dim.height, overflowY: "auto" }}>
                        <PlaceholderComponent id={DefaultComponentNames.Legend}
                                              locale={locale}
                                              componentProps={{ inlineBaseLayerSwitcher: false }} />
                    </div>;
                }
            },
            {
                id: "Selection",
                title: tr("TPL_TITLE_SELECTION_PANEL", locale),
                contentRenderer: (dim: IAccordionPanelContentDimensions) => {
                    return <div style={{ width: dim.width, height: dim.height, overflowY: "auto" }}>
                        <PlaceholderComponent id={DefaultComponentNames.SelectionPanel}
                                              locale={locale} />
                    </div>;
                }
            },
            {
                id: "TaskPane",
                title: tr("TPL_TITLE_TASKPANE", locale),
                contentRenderer: (dim: IAccordionPanelContentDimensions) => {
                    return <div style={{ width: dim.width, height: dim.height, overflowY: "auto" }}>
                        <PlaceholderComponent id={DefaultComponentNames.TaskPane}
                                                 locale={locale} />
                    </div>;
                }
            }
        ];
        let activeId;
        const states = [
            { id: "Selection", visible: this.props.showSelection },
            { id: "TaskPane", visible: this.props.showTaskPane },
            { id: "Legend", visible: this.props.showLegend }
        ];
        const active = states.filter(st => st.visible);
        if (active.length == 1) {
            activeId = active[0].id;
        }
        const TB_Z_INDEX = 0;
        return <div style={{ width: "100%", height: "100%" }}>
            <Accordion style={{ position: "absolute", top: OUTER_PADDING, bottom: bottomOffset, right: OUTER_PADDING, width: SIDEBAR_WIDTH }} onActivePanelChanged={this.fnActivePanelChanged} activePanelId={activeId} panels={panels} />
            <ToolbarContainer id="FileMenu" containerClass="maroon-file-menu" containerStyle={{ position: "absolute", left: OUTER_PADDING, top: OUTER_PADDING, right: SIDEBAR_WIDTH + OUTER_PADDING, zIndex: TB_Z_INDEX }} />
            <ToolbarContainer id="Toolbar" containerClass="maroon-toolbar" containerStyle={{ position: "absolute", left: OUTER_PADDING, top: DEFAULT_TOOLBAR_SIZE + OUTER_PADDING, right: SIDEBAR_WIDTH + OUTER_PADDING, zIndex: TB_Z_INDEX }} />
            <ToolbarContainer id="ToolbarVertical" containerClass="maroon-toolbar-vertical" vertical={true} containerStyle={{ position: "absolute", left: OUTER_PADDING, top: topOffset, bottom: bottomOffset, zIndex: TB_Z_INDEX, right: 0 }} />
            <div style={{ position: "absolute", left: OUTER_PADDING + DEFAULT_TOOLBAR_SIZE, right: SIDEBAR_WIDTH + OUTER_PADDING, top: topOffset, bottom: bottomOffset }}>
                {(() => {
                    //NOTE: We have to delay render this behind an IIFE because otherwise this component may be mounted with
                    //sidebar elements not being ready, which may result in a distorted OL map when it mounts, requiring a updateSize()
                    //call to fix
                    if (this.props.map != null) {
                        return <PlaceholderComponent id={DefaultComponentNames.Map} locale={locale} />;
                    }
                })()}
                {(() => {
                    if (hasNavigator) {
                        return <PlaceholderComponent id={DefaultComponentNames.Navigator} locale={locale} />;
                    }
                })()}
            </div>
            {(() => {
                if (hasStatusBar) {
                    return <div className="maroon-status-bar" style={{ position: "absolute", left: 0, bottom: 0, right: 0, height: bottomOffset }}>
                        <PlaceholderComponent id={DefaultComponentNames.MouseCoordinates} locale={locale} />
                        <PlaceholderComponent id={DefaultComponentNames.ScaleDisplay} locale={locale} />
                        <PlaceholderComponent id={DefaultComponentNames.SelectedFeatureCount} locale={locale} />
                        <PlaceholderComponent id={DefaultComponentNames.ViewSize} locale={locale} />
                        <PlaceholderComponent id={DefaultComponentNames.PoweredByMapGuide} locale={locale} />
                    </div>;
                }
            })()}
            <ViewerApiShim />
            <ModalLauncher />
            <FlyoutRegionContainer />
            <InitWarningDisplay />
        </div>;
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(MaroonTemplateLayout);