import { LitElement, html, customElement, property, CSSResult, TemplateResult, css, PropertyValues } from 'lit-element';
import { HomeAssistant, hasAction, ActionHandlerEvent, handleAction, LovelaceCardEditor } from 'custom-card-helpers';
import dayjs from 'dayjs';

import './editor';
import Chart from 'chart.js';

import { YrCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  YR-CARD %c ${CARD_VERSION} `,
  'color: white; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// TODO Name your custom element
@customElement('yr-card')
export class YrCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('yr-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): object {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  @property() public hass?: HomeAssistant;
  @property() private _config?: YrCardConfig;

  public setConfig(config: YrCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    this._config = {
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has('_config')) {
      return true;
    }

    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

    if (!this._config || !oldHass) {
      return true;
    }

    for (const entity of this._config.entities) {
      if (oldHass.states[entity] !== this.hass?.states[entity]) {
        return true;
      }
    }

    return false;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const state = this.hass.states[this._config.entities[0]];

    //console.log('*** state', state.attributes.forecast);

    return html`
      <ha-card
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config.hold_action),
          hasDoubleTap: hasAction(this._config.double_tap_action),
          repeat: this._config.hold_action ? this._config.hold_action.repeat : undefined,
        })}
        tabindex="0"
        aria-label=${`Yr: ${this._config.name}`}
      >
        <ha-card>
          <div style="height: 130px;">
            <canvas height="90" id="myChart"></canvas>
          </div>
          <div style="margin-top: -124px;padding-top:6px; padding-bottom:6px;">
            <div class="container">
              ${state.attributes.forecast.slice(0, 5).map(entity => {
                return html`
                  <div class="item">
                    <div class="period">${dayjs(entity.from).format('HH')} - ${dayjs(entity.to).format('HH')}</div>
                    <img class="image" src="https://www.yr.no/grafikk/sym/v2016/png/100/${entity.symbolVar}.png" />
                    <div class="temperature">${entity.temperature}&deg;</div>
                    ${this.precipitation(entity.precipitationMinValue, entity.precipitationMaxvalue)}
                  </div>
                `;
              })}
            </div>
          </div>
        </ha-card>
      </ha-card>
    `;
  }

  private myChart;

  protected updated(): void {
    console.log('*** met updated');
    if (!this._config || !this.hass) {
      return;
    }

    const met = this.hass?.states[this._config.entities[1]];
    const nowCast = met?.attributes.forecast;

    const element: any = this.shadowRoot?.getElementById('myChart');
    element.innerHTML = '';

    //nowCast.find(s => parseFloat(s.value) > 0) > 0 &&∆
    if (element) {
      const metData = nowCast.map(cast => ({ x: new Date(cast.from).getTime(), y: parseFloat(cast.value) }));
      // console.log('***', metData);
      // console.log('*** nowCast', nowCast);

      const ctx = element.getContext('2d');
      this.myChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: nowCast.map(cast => new Date(cast.from).toTimeString()),
          datasets: [
            {
              label: 'My First dataset',
              backgroundColor: 'rgba(227, 227, 227, 0.4)',
              borderColor: 'transparent',
              // borderWidth: 1,
              data: metData,
              fill: true,
              pointStyle: 'line',
            },
          ],
        },
        options: {
          responsive: true,
          legend: {
            display: false,
          },
          tooltips: {
            mode: 'index',
            intersect: false,
          },
          hover: {
            mode: 'nearest',
            intersect: true,
          },
          scales: {
            xAxes: [
              {
                display: false,
              },
            ],
            yAxes: [
              {
                display: false,
                ticks: {
                  beginAtZero: true,
                  suggestedMax: 2.5,
                },
              },
            ],
          },
        },
      });
      this.myChart.update();
    }
  }

  private precipitation(precipitationMinValueString: string, precipitationMaxvalueString: string): TemplateResult {
    const precipitationMinValue = parseFloat(precipitationMinValueString);
    const precipitationMaxvalue = parseFloat(precipitationMaxvalueString);

    if (precipitationMinValue === 0 && precipitationMaxvalue === 0) {
      return html``;
    } else {
      return html`
        <div class="precipitation">${precipitationMinValue} - ${precipitationMaxvalue} mm</div>
      `;
    }
  }
  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this._config && ev.detail.action) {
      handleAction(this, this.hass, this._config, ev.detail.action);
    }
  }

  static get styles(): CSSResult {
    return css`
      .warning {
        display: block;
        color: black;
        background-color: #fce588;
        padding: 8px;
      }
      .period {
        font-size: 0.8rem;
      }
      .temperature {
        font-size: 1.5em;
        font-weight: 400;
        text-align: center;
      }
      .container {
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: flex-start;
        flex-direction: row;
        // padding: 10px;
      }
      .item {
        text-align: center;
        width: 50%;
      }
      .image {
        height: 50px;
        padding-top: 8px;
        padding-bottom: 4px;
      }
      .precipitation {
        font-size: 0.7rem;
      }
    `;
  }
}
