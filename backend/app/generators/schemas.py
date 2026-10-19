"""Structured shape of each deliverable. The LLM must return JSON matching these,
which keeps outputs consistent and makes them easy to render or export (pptx, docx, srt)."""

from pydantic import BaseModel, Field


class Scene(BaseModel):
    number: int
    duration_seconds: int
    visual: str = Field(description="What is on screen: shot, footage or graphic")
    narration: str
    on_screen_text: str


class SubtitleLine(BaseModel):
    start: str = Field(description="HH:MM:SS,mmm")
    end: str = Field(description="HH:MM:SS,mmm")
    text: str


class VideoPackage(BaseModel):
    title: str
    logline: str
    script: str = Field(description="Full narration script")
    storyboard: list[Scene]
    subtitles: list[SubtitleLine]
    visual_recommendations: list[str]
    music_and_tone: str


class LinkedInPost(BaseModel):
    hook: str
    body: str
    call_to_action: str
    hashtags: list[str]


class Tweet(BaseModel):
    text: str = Field(description="At most 280 characters")


class TwitterThread(BaseModel):
    tweets: list[Tweet]
    hashtags: list[str]


class AdvisorySection(BaseModel):
    heading: str
    content: str


class Advisory(BaseModel):
    title: str
    advisory_id: str
    severity: str = Field(description="Critical, High, Medium, Low or Informational")
    summary: str
    affected: list[str] = Field(description="Systems, sectors or groups affected")
    sections: list[AdvisorySection] = Field(description="E.g. Description, Impact, Indicators")
    recommendations: list[str]
    references: list[str]


class InfographicSection(BaseModel):
    heading: str
    key_stat_or_fact: str
    supporting_text: str
    icon_suggestion: str


class Infographic(BaseModel):
    title: str
    subtitle: str
    key_message: str
    sections: list[InfographicSection]
    layout_recommendation: str
    color_palette: list[str] = Field(description="Hex colours")
    call_to_action: str


class ExecutiveSummary(BaseModel):
    title: str
    bottom_line: str = Field(description="One or two sentence BLUF")
    key_points: list[str]
    implications: list[str]
    recommended_actions: list[str]


class Slide(BaseModel):
    title: str
    bullets: list[str]
    speaker_notes: str
    visual_suggestion: str


class Presentation(BaseModel):
    title: str
    subtitle: str
    slides: list[Slide]
