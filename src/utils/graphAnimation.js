import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

// 每个星图拥有独立的 context：只操作传入根节点，离屏暂停、卸载彻底清理。
export function createGraphAnimation(root, onPhase) {
  let drawingContext, flowContext, selectionContext, drawing;
  let flows = [],
    pulses = [],
    playing = false,
    reduced = false,
    drawn = false,
    disposed = false;
  const phase = (value) => {
    if (!disposed) onPhase(value);
  };
  const pauseOrPlay = (animation) =>
    animation && (playing && !reduced ? animation.play() : animation.pause());

  function sync() {
    if (disposed || reduced) return;
    if (!drawn && drawing) {
      if (playing) phase("drawing");
      pauseOrPlay(drawing);
    }
    flows.forEach(pauseOrPlay);
    pulses.forEach(pauseOrPlay);
  }

  function startFlows() {
    flowContext?.revert();
    flows = [];
    const paths = root.querySelectorAll(".graph-link");
    flowContext = gsap.context(() => {
      root.querySelectorAll(".graph-packet").forEach((packet, index) => {
        const path = paths[index];
        if (!path || path.getTotalLength() < 1) return;
        const duration = Math.max(
          1.6,
          Math.min(4.5, path.getTotalLength() / 130),
        );
        const flow = gsap.timeline({
          paused: true,
          repeat: -1,
          repeatDelay: 0.9,
          delay: index * 0.17,
        });
        // 使用同一 SVG 坐标系内的 path 字符串，viewBox 缩放后光点仍与连线重合。
        flow
          .set(packet, { opacity: 0 })
          .to(packet, { opacity: 1, duration: 0.12 }, 0)
          .to(
            packet,
            {
              motionPath: { path: path.getAttribute("d") },
              duration,
              ease: "none",
            },
            0,
          )
          .to(packet, { opacity: 0, duration: 0.18 }, duration - 0.18);
        flows.push(flow);
      });
    }, root);
    sync();
  }

  function select() {
    selectionContext?.revert();
    pulses = [];
    const waves = root.querySelectorAll(".selection-wave");
    waves.forEach((wave) => {
      wave.style.opacity = "0";
    });
    if (reduced || disposed) return;
    selectionContext = gsap.context(() => {
      waves.forEach((wave, index) => {
        pulses.push(
          gsap.fromTo(
            wave,
            { attr: { r: 15 }, opacity: 0.65 },
            {
              attr: { r: 43 },
              opacity: 0,
              duration: 1.7,
              delay: index * 0.7,
              repeat: -1,
              repeatDelay: 0.35,
              ease: "power1.out",
              paused: true,
            },
          ),
        );
      });
    }, root);
    sync();
  }

  function rebuild(options) {
    drawingContext?.revert();
    flowContext?.revert();
    selectionContext?.revert();
    drawing = null;
    flows = [];
    pulses = [];
    reduced = options.reduced;
    const paths = Array.from(root.querySelectorAll(".graph-link"));
    drawn = reduced || !options.draw || !paths.length;
    root.querySelectorAll(".graph-packet").forEach((packet) => {
      packet.style.opacity = "0";
    });
    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(drawn ? 0 : length);
    });
    if (reduced) {
      phase("static");
    } else if (drawn) {
      phase("flowing");
      startFlows();
    } else {
      phase("waiting");
      drawingContext = gsap.context(() => {
        drawing = gsap.timeline({
          paused: true,
          onComplete() {
            if (disposed) return;
            drawn = true;
            phase("flowing");
            startFlows();
          },
        });
        // 按实际路径长度设置虚线，再归零偏移；大量连线的总错峰不超过 0.35 秒。
        paths.forEach((path, index) =>
          drawing.to(
            path,
            { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" },
            Math.min(index * 0.08, 0.35),
          ),
        );
      }, root);
    }
    select();
    sync();
  }

  return {
    rebuild,
    select,
    setPlaying(value) {
      playing = value;
      sync();
    },
    destroy() {
      disposed = true;
      drawingContext?.revert();
      flowContext?.revert();
      selectionContext?.revert();
      drawing = null;
      flows = [];
      pulses = [];
    },
  };
}
