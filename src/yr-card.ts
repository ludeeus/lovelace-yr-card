import { LitElement, html, customElement, property, CSSResult, TemplateResult, css, PropertyValues } from 'lit-element';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  LovelaceCard,
  getLovelace,
} from 'custom-card-helpers';
import dayjs from 'dayjs';

import './editor';

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
    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }
    const state = this.hass.states[this._config.entity];

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
        aria-label=${`Yr: ${this._config.entity}`}
      >
        <ha-card>
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
        </ha-card>
      </ha-card>
    `;
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
        align-items: center;
        flex-direction: row;
        // width: 100%;
        padding: 10px;
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
        font-size: 0.8em;
      }
    `;
  }
}
