// @ts-ignore
import { emit } from '@tauri-apps/api/event';
import {
    AndroidKeyEventAction,
    AndroidKeycode,
    AndroidMetastate,
    AndroidMotionEventAction,
    AndroidMotionEventButtons,
} from './android';

interface ControlMsgPayload {
    msgType: ControlMsgType;
    msgData?: ControlMsgData;
}

async function sendControlMsg(payload: ControlMsgPayload) {
    await emit('front-command', payload);
}

export async function sendInjectKeycode(payload: InjectKeycode) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeInjectKeycode,
        msgData: payload,
    });
}

export async function sendInjectText(payload: InjectText) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeInjectText,
        msgData: payload,
    });
}

export async function sendInjectTouchEvent(payload: InjectTouchEvent) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeInjectTouchEvent,
        msgData: payload,
    });
}

export async function sendInjectScrollEvent(payload: InjectScrollEvent) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeInjectScrollEvent,
        msgData: payload,
    });
}

export async function sendBackOrScreenOn(payload: BackOrScreenOn) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeBackOrScreenOn,
        msgData: payload,
    });
}

export async function sendExpandNotificationPanel() {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeExpandNotificationPanel,
    });
}

export async function sendExpandSettingsPanel() {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeExpandSettingsPanel,
    });
}

export async function sendCollapsePanels() {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeCollapsePanels,
    });
}

export async function sendGetClipboard(payload: GetClipboard) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeGetClipboard,
        msgData: payload,
    });
}

export async function sendSetClipboard(payload: SetClipboard) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeSetClipboard,
        msgData: payload,
    });
}

export async function sendSetScreenPowerMode(payload: SetScreenPowerMode) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeSetScreenPowerMode,
        msgData: payload,
    });
}

export async function sendRotateDevice() {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeRotateDevice,
    });
}

export async function sendUhidCreate(payload: UhidCreate) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeUhidCreate,
        msgData: payload,
    });
}

export async function sendUhidInput(payload: UhidInput) {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeUhidInput,
        msgData: payload,
    });
}

export async function sendOpenHardKeyboardSettings() {
    await sendControlMsg({
        msgType: ControlMsgType.ControlMsgTypeOpenHardKeyboardSettings,
    });
}

export enum ControlMsgType {
    ControlMsgTypeInjectKeycode,
    ControlMsgTypeInjectText,
    ControlMsgTypeInjectTouchEvent,
    ControlMsgTypeInjectScrollEvent,
    ControlMsgTypeBackOrScreenOn,
    ControlMsgTypeExpandNotificationPanel,
    ControlMsgTypeExpandSettingsPanel,
    ControlMsgTypeCollapsePanels,
    ControlMsgTypeGetClipboard,
    ControlMsgTypeSetClipboard,
    ControlMsgTypeSetScreenPowerMode,
    ControlMsgTypeRotateDevice,
    ControlMsgTypeUhidCreate,
    ControlMsgTypeUhidInput,
    ControlMsgTypeOpenHardKeyboardSettings,
}

type ControlMsgData =
    | InjectKeycode
    | InjectText
    | InjectTouchEvent
    | InjectScrollEvent
    | BackOrScreenOn
    | GetClipboard
    | SetClipboard
    | SetScreenPowerMode
    | UhidCreate
    | UhidInput;

interface ScPosition {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface InjectKeycode {
    action: AndroidKeyEventAction;
    keycode: AndroidKeycode;
    repeat: number;
    metastate: AndroidMetastate;
}

export enum ScCopyKey {
    SC_COPY_KEY_NONE,
    SC_COPY_KEY_COPY,
    SC_COPY_KEY_CUT,
}

export enum ScScreenPowerMode {
    SC_SCREEN_POWER_MODE_OFF = 0,
    SC_SCREEN_POWER_MODE_NORMAL = 2,
}

interface InjectText {
    text: string;
}

interface InjectTouchEvent {
    action: AndroidMotionEventAction;
    actionButton: AndroidMotionEventButtons;
    buttons: AndroidMotionEventButtons;
    pointerId: number;
    position: ScPosition;
    pressure: number;
}

interface InjectScrollEvent {
    position: ScPosition;
    hscroll: number;
    vscroll: number;
    buttons: AndroidMotionEventButtons;
}

interface BackOrScreenOn {
    action: AndroidKeyEventAction;
}

interface GetClipboard {
    copyKey: ScCopyKey;
}

interface SetClipboard {
    sequence: number;
    text: string;
    paste: boolean;
}

interface SetScreenPowerMode {
    mode: ScScreenPowerMode;
}

interface UhidCreate {
    id: number;
    reportDescSize: number;
    reportDesc: Uint8Array;
}

interface UhidInput {
    id: number;
    size: number;
    data: Uint8Array;
}
