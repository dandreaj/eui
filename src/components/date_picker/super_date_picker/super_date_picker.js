
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import classNames from 'classnames';
import { commonlyUsedRangeShape, recentlyUsedRangeShape } from './types';
import { prettyDuration, showPrettyDuration } from './pretty_duration';
import { prettyInterval } from './pretty_interval';

import dateMath from '@elastic/datemath';

import { EuiSuperUpdateButton } from './super_update_button';
import { EuiQuickSelectPopover } from './quick_select_popover/quick_select_popover';
import { EuiDatePopoverButton } from './date_popover/date_popover_button';

import { EuiDatePickerRange } from '../date_picker_range';
import { EuiFormControlLayout } from '../../form';
import { EuiFlexGroup, EuiFlexItem } from '../../flex';

function isRangeInvalid(start, end) {
  if (start === 'now' && end === 'now') {
    return true;
  }

  const startMoment = dateMath.parse(start);
  const endMoment = dateMath.parse(end, { roundUp: true });
  if (startMoment.isAfter(endMoment)) {
    return true;
  }

  return false;
}

export class EuiSuperDatePicker extends Component {

  static propTypes = {
    isLoading: PropTypes.bool,
    /**
     * String as either datemath (e.g.: now, now-15m, now-15m/m) or
     * absolute date in the format 'YYYY-MM-DDTHH:mm:ss.sssZ'
     */
    start: PropTypes.string,
    /**
     * String as either datemath (e.g.: now, now-15m, now-15m/m) or
     * absolute date in the format 'YYYY-MM-DDTHH:mm:ss.sssZ'
     */
    end: PropTypes.string,
    /**
     * Callback for when the time changes. Called with { start, end, isQuickSelection, isInvalid }
     */
    onTimeChange: PropTypes.func.isRequired,
    isPaused: PropTypes.bool,
    /**
     * Refresh interval in milliseconds
     */
    refreshInterval: PropTypes.number,
    /**
     * Callback for when the refresh interval changes. Called with { isPaused, refreshInterval }
     * Supply onRefreshChange to show refresh interval inputs in quick select popover
     */
    onRefreshChange: PropTypes.func,

    /**
     * 'start' and 'end' must be string as either datemath (e.g.: now, now-15m, now-15m/m) or
     * absolute date in the format 'YYYY-MM-DDTHH:mm:ss.sssZ'
     */
    commonlyUsedRanges: PropTypes.arrayOf(commonlyUsedRangeShape),
    dateFormat: PropTypes.string,
    /**
     * 'start' and 'end' must be string as either datemath (e.g.: now, now-15m, now-15m/m) or
     * absolute date in the format 'YYYY-MM-DDTHH:mm:ss.sssZ'
     */
    recentlyUsedRanges: PropTypes.arrayOf(recentlyUsedRangeShape),
    /**
     * Set showUpdateButton to false to immediately invoke onTimeChange for all start and end changes.
     */
    showUpdateButton: PropTypes.bool,
    /**
     * Set isAutoRefreshOnly to true to limit the component to only display auto refresh content.
     */
    isAutoRefreshOnly: PropTypes.bool,
  }

  static defaultProps = {
    start: 'now-15m',
    end: 'now',
    isPaused: true,
    refreshInterval: 0,
    commonlyUsedRanges: [
      { start: 'now/d', end: 'now/d', label: 'Today' },
      { start: 'now-1d/d', end: 'now-1d/d', label: 'Yesterday' },
      { start: 'now/w', end: 'now/w', label: 'This week' },
      { start: 'now/w', end: 'now', label: 'Week to date' },
      { start: 'now/M', end: 'now/M', label: 'This month' },
      { start: 'now/M', end: 'now', label: 'Month to date' },
      { start: 'now/y', end: 'now/y', label: 'This year' },
      { start: 'now/y', end: 'now', label: 'Year to date' },
    ],
    dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
    recentlyUsedRanges: [],
    showUpdateButton: true,
    isAutoRefreshOnly: false,
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.start !== prevState.prevProps.start
      || nextProps.end !== prevState.prevProps.end) {
      return {
        prevProps: {
          start: nextProps.start,
          end: nextProps.end,
        },
        start: nextProps.start,
        end: nextProps.end,
        isInvalid: isRangeInvalid(nextProps.start, nextProps.end),
        hasChanged: false,
        showPrettyDuration: showPrettyDuration(nextProps.start, nextProps.end, nextProps.commonlyUsedRanges),
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    const {
      start,
      end,
      commonlyUsedRanges
    } = this.props;

    this.state = {
      prevProps: {
        start: props.start,
        end: props.end,
      },
      start,
      end,
      isInvalid: isRangeInvalid(start, end),
      hasChanged: false,
      showPrettyDuration: showPrettyDuration(start, end, commonlyUsedRanges),
    };
  }

  setTime = ({ start, end }) => {
    const isInvalid = isRangeInvalid(start, end);

    this.setState({
      start,
      end,
      isInvalid,
      hasChanged: true,
    });

    if (!this.props.showUpdateButton) {
      this.props.onTimeChange({
        start,
        end,
        isQuickSelection: false,
        isInvalid,
      });
    }
  }

  setStart = (start) => {
    this.setTime({ start, end: this.state.end });
  }

  setEnd = (end) => {
    this.setTime({ start: this.state.start, end });
  }

  applyTime = () => {
    this.props.onTimeChange({
      start: this.state.start,
      end: this.state.end,
      isQuickSelection: false,
      isInvalid: false,
    });
  }

  applyQuickTime = ({ start, end }) => {
    this.setState({
      showPrettyDuration: showPrettyDuration(start, end, this.props.commonlyUsedRanges),
    });
    this.props.onTimeChange({
      start,
      end,
      isQuickSelection: true,
      isInvalid: false
    });
  }

  hidePrettyDuration = () => {
    this.setState({ showPrettyDuration: false });
  }

  renderDatePickerRange = () => {
    const {
      start,
      end,
      hasChanged,
      isInvalid,
    } = this.state;

    if (this.props.isAutoRefreshOnly) {
      return (
        <EuiDatePickerRange
          className="euiDatePickerRange--inGroup"
          iconType={false}
          isCustom
          startDateControl={<div/>}
          endDateControl={<div/>}
          readOnly
        >
          <span className="euiSuperDatePicker__prettyFormat">
            {prettyInterval(this.props.isPaused, this.props.refreshInterval)}
          </span>
        </EuiDatePickerRange>
      );
    }

    if (this.state.showPrettyDuration) {
      return (
        <EuiDatePickerRange
          className="euiDatePickerRange--inGroup"
          iconType={false}
          isCustom
          startDateControl={<div/>}
          endDateControl={<div/>}
        >
          <button
            className="euiSuperDatePicker__prettyFormat"
            data-test-subj="superDatePickerShowDatesButton"
            onClick={this.hidePrettyDuration}
          >
            {prettyDuration(start, end, this.props.commonlyUsedRanges, this.props.dateFormat)}
            <span className="euiSuperDatePicker__prettyFormatLink">Show dates</span>
          </button>
        </EuiDatePickerRange>
      );
    }

    return (
      <EuiDatePickerRange
        className="euiDatePickerRange--inGroup"
        iconType={false}
        isCustom
        startDateControl={
          <EuiDatePopoverButton
            position="start"
            needsUpdating={hasChanged}
            isInvalid={isInvalid}
            onChange={this.setStart}
            value={start}
            dateFormat={this.props.dateFormat}
          />
        }
        endDateControl={
          <EuiDatePopoverButton
            position="end"
            needsUpdating={hasChanged}
            isInvalid={isInvalid}
            onChange={this.setEnd}
            value={end}
            dateFormat={this.props.dateFormat}
            roundUp
          />
        }
      />
    );
  }

  renderUpdateButton = () => {
    if (!this.props.showUpdateButton || this.props.isAutoRefreshOnly) {
      return;
    }

    return (
      <EuiFlexItem grow={false}>
        <EuiSuperUpdateButton
          needsUpdate={this.state.hasChanged}
          isLoading={this.props.isLoading}
          isDisabled={this.state.isInvalid}
          onClick={this.applyTime}
          data-test-subj="superDatePickerApplyTimeButton"
        />
      </EuiFlexItem>
    );
  }

  render() {
    const quickSelect = (
      <EuiQuickSelectPopover
        applyTime={this.applyQuickTime}
        start={this.props.start}
        end={this.props.end}
        applyRefreshInterval={this.props.onRefreshChange}
        isPaused={this.props.isPaused}
        refreshInterval={this.props.refreshInterval}
        commonlyUsedRanges={this.props.commonlyUsedRanges}
        dateFormat={this.props.dateFormat}
        recentlyUsedRanges={this.props.recentlyUsedRanges}
        isAutoRefreshOnly={this.props.isAutoRefreshOnly}
      />
    );

    const flexWrapperClasses = classNames(
      'euiSuperDatePicker__flexWrapper',
      {
        'euiSuperDatePicker__flexWrapper--noUpdateButton': !this.props.showUpdateButton,
        'euiSuperDatePicker__flexWrapper--isAutoRefreshOnly': this.props.isAutoRefreshOnly,
      }
    );

    return (
      <EuiFlexGroup gutterSize="s" responsive={false} className={flexWrapperClasses}>

        <EuiFlexItem>
          <EuiFormControlLayout
            className="euiSuperDatePicker"
            prepend={quickSelect}
          >
            {this.renderDatePickerRange()}
          </EuiFormControlLayout>
        </EuiFlexItem>

        {this.renderUpdateButton()}

      </EuiFlexGroup>
    );
  }
}
