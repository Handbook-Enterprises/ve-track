import { ClerkProvider } from "@clerk/react-router";
import { dark } from "@clerk/themes";
import { useTheme } from "./theme-provider";

interface Props extends React.ComponentProps<typeof ClerkProvider> {
  children: React.ReactNode;
}

export default function ClerkThemedProvider({ children, appearance, ...rest }: Props) {
  const { theme } = useTheme();

  const resolvedDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <ClerkProvider
      {...rest}
      appearance={{
        ...(resolvedDark ? { baseTheme: dark } : {}),
        ...appearance,
        variables: {
          colorPrimary: "#FF4D00",
          borderRadius: "0",
          ...(appearance?.variables ?? {}),
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
