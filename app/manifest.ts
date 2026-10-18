import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grocerly — Good Food. Brighter Days.",
    short_name: "Grocerly",
    description: "Premium groceries, smarter choices and a healthier tomorrow — delivered to your door.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F7F2",
    theme_color: "#163C29",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
