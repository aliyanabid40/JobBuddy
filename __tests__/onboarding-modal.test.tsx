import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog";

// Mock router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock upload action
jest.mock("@/features/resume/actions", () => ({
  uploadAndParseResume: jest.fn(),
}));

describe("OnboardingDialog Component", () => {
  it("renders non-closable dialog when user is not onboarded", () => {
    render(<OnboardingDialog initialOnboardingDone={false} />);

    expect(screen.getByText("Upload your resume to get started")).toBeInTheDocument();
    expect(screen.getByText("Welcome to JobBuddy")).toBeInTheDocument();
    expect(
      screen.getByText("Drop your resume here, or")
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", {
      name: /Analyze Resume & Set Up Profile/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("does not render when user is already onboarded", () => {
    const { container } = render(<OnboardingDialog initialOnboardingDone={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an error when a non-PDF or non-DOCX file is selected", () => {
    render(<OnboardingDialog initialOnboardingDone={false} />);

    const invalidFile = new File(["test image"], "resume.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(
      screen.getByText("Please select a PDF or DOCX resume file.")
    ).toBeInTheDocument();
  });

  it("enables the submit button when a valid PDF is selected", () => {
    render(<OnboardingDialog initialOnboardingDone={false} />);

    const validFile = new File(["dummy pdf content"], "my-resume.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [validFile] } });

    expect(screen.getByText("my-resume.pdf")).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", {
      name: /Analyze Resume & Set Up Profile/i,
    });
    expect(submitBtn).not.toBeDisabled();
  });
});
