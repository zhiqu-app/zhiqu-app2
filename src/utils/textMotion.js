import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

/** 静态产品文案逐字淡入；aria:auto 保留整句朗读，销毁时恢复原始 DOM。 */
export function createTextReveals(root, selector, { delay = 0 } = {}) {
  const splits = [];
  const context = gsap.context(() => {
    root.querySelectorAll(selector).forEach((element) => {
      const split = SplitText.create(element, {
        type: "chars",
        tag: "span",
        charsClass: "product-text-char",
        aria: "auto",
        smartWrap: false,
      });
      splits.push(split);
      gsap.fromTo(
        split.chars,
        { opacity: 0, yPercent: 38 },
        {
          opacity: 1,
          yPercent: 0,
          duration: 0.55,
          delay,
          stagger: { amount: Math.min(0.5, split.chars.length * 0.023) },
          ease: "power2.out",
          force3D: false,
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: element, start: "top 89%", once: true },
        },
      );
    });
  }, root);
  return () => {
    context.revert();
    splits.reverse().forEach((split) => split.revert());
  };
}
